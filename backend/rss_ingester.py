import feedparser
import json
import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from typing import List, Dict
from bs4 import BeautifulSoup
import re
import time
from scraper import enrich_article_content

# RSS Feeds - Top 10 English News Sources
RSS_FEEDS = {
    # Top US News
    "CNN": "http://rss.cnn.com/rss/edition.rss",
    "BBC News": "http://feeds.bbci.co.uk/news/rss.xml",
    "The New York Times": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "The Guardian": "https://www.theguardian.com/world/rss",
    "Reuters": "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
    
    # Tech & Business
    "TechCrunch": "https://techcrunch.com/feed/",
    "The Wall Street Journal": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
    "Bloomberg": "https://www.bloomberg.com/feed/podcast/business.xml",
    
    # Tech & Science
    "Wired": "https://www.wired.com/feed/rss",
    "Ars Technica": "https://feeds.arstechnica.com/arstechnica/index",
}

class RSSIngester:
    def __init__(self, output_file: str = "news.json"):
        self.output_file = output_file
        self.articles = []
        self.seen_hashes = set()
        self._lock = threading.Lock()
        self.existing_articles = []
        
        # Load existing articles to avoid re-scraping
        try:
            with open(self.output_file, 'r', encoding='utf-8') as f:
                self.existing_articles = json.load(f)
                # Populate seen_hashes with existing articles
                for article in self.existing_articles:
                    article_hash = self.get_content_hash(article['title'], article['url'])
                    self.seen_hashes.add(article_hash)
                print(f"📚 Loaded {len(self.existing_articles)} existing articles")
        except FileNotFoundError:
            print("📝 No existing articles found, starting fresh")
    
    def clean_html(self, html_content: str) -> str:
        """Remove HTML tags and clean text"""
        if not html_content:
            return ""
        
        soup = BeautifulSoup(html_content, 'html.parser')
        text = soup.get_text()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Limit length
        return text[:1000] if len(text) > 1000 else text
    
    def get_content_hash(self, title: str, url: str) -> str:
        """Generate hash for deduplication"""
        content = f"{title}{url}".lower()
        return hashlib.md5(content.encode()).hexdigest()
    
    def parse_date(self, entry) -> str:
        """Parse date from feed entry"""
        try:
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                dt = datetime(*entry.published_parsed[:6])
                return dt.strftime("%Y-%m-%d")
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                dt = datetime(*entry.updated_parsed[:6])
                return dt.strftime("%Y-%m-%d")
        except:
            pass
        
        return datetime.now().strftime("%Y-%m-%d")
    
    def fetch_feed(self, source: str, url: str, scrape_full: bool = True, days_back: int = 4) -> List[Dict]:
        """Fetch and parse a single RSS feed, scraping articles in parallel."""
        raw_articles: List[Dict] = []
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        try:
            print(f"📡 Fetching {source}...")
            feed = feedparser.parse(url)
            
            for entry in feed.entries[:50]:  # Check up to 50 entries
                article_date = self.parse_date(entry)
                try:
                    article_datetime = datetime.strptime(article_date, "%Y-%m-%d")
                    if article_datetime < cutoff_date:
                        continue
                except:
                    pass
                
                content = ""
                if hasattr(entry, 'summary'):
                    content = self.clean_html(entry.summary)
                elif hasattr(entry, 'description'):
                    content = self.clean_html(entry.description)
                elif hasattr(entry, 'content'):
                    content = self.clean_html(entry.content[0].value)
                
                if not content or len(content) < 50:
                    continue
                
                article = {
                    "title": entry.get('title', 'Sin título'),
                    "source": source,
                    "url": entry.get('link', ''),
                    "date": article_date,
                    "content": content,
                    "scraped": False
                }
                
                article_hash = self.get_content_hash(article['title'], article['url'])
                with self._lock:
                    if article_hash in self.seen_hashes:
                        continue
                    self.seen_hashes.add(article_hash)
                raw_articles.append(article)
                if len(raw_articles) >= 20:
                    break
            
            # Scrape full content in parallel (4 threads per source)
            if scrape_full and raw_articles:
                enriched: List[Dict] = []
                with ThreadPoolExecutor(max_workers=4) as pool:
                    futures = {pool.submit(enrich_article_content, a): i for i, a in enumerate(raw_articles)}
                    for f in as_completed(futures):
                        try:
                            enriched.append(f.result())
                        except Exception as e:
                            print(f"    ⚠️  Enrich failed: {e}")
                raw_articles = enriched
            
            print(f"  ✅ {source}: {len(raw_articles)} artículos")
            
        except Exception as e:
            print(f"  ❌ Error fetching {source}: {str(e)}")
        
        return raw_articles
    
    def fetch_all(self, max_feeds: int = None, scrape_full: bool = True, days_back: int = 4) -> List[Dict]:
        """Fetch from all RSS feeds in parallel."""
        self.articles = []
        
        feeds = list(RSS_FEEDS.items())
        if max_feeds:
            feeds = feeds[:max_feeds]
        
        print(f"\n🔍 Fetching articles from last {days_back} days (parallel)...\n")
        
        self._parallel_fetch(feeds, scrape_full=scrape_full, days_back=days_back)
        
        # Add IDs
        for idx, article in enumerate(self.articles, 1):
            article['id'] = idx
        
        return self.articles
    
    def _parallel_fetch(self, feeds: List[tuple], scrape_full: bool = True, days_back: int = 4):
        """Scrape multiple feeds concurrently."""
        start = time.time()
        workers = min(8, len(feeds))  # up to 8 feeds at once
        results: List[Dict] = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(self.fetch_feed, name, url, scrape_full, days_back): name
                for name, url in feeds
            }
            for future in as_completed(futures):
                name = futures[future]
                try:
                    arts = future.result()
                    results.extend(arts)
                except Exception as e:
                    print(f"  ❌ {name} failed: {e}")
        self.articles = results
        elapsed = time.time() - start
        print(f"\n⚡ Parallel fetch done: {len(self.articles)} articles in {elapsed:.1f}s")
    
    def save(self):
        """Save articles to JSON file, merging with existing ones"""
        # Merge new articles with existing ones
        all_articles = self.existing_articles + self.articles
        
        # Re-assign IDs to all articles
        for idx, article in enumerate(all_articles, 1):
            article['id'] = idx
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(all_articles, f, ensure_ascii=False, indent=2)
        
        scraped_count = sum(1 for art in self.articles if art.get('scraped', False))
        print(f"\n💾 Added {len(self.articles)} new articles ({scraped_count} fully scraped)")
        print(f"   Total in database: {len(all_articles)} articles")
    
    def get_stats(self) -> Dict:
        """Get ingestion statistics"""
        sources = {}
        scraped_count = 0
        total_content_length = 0
        
        # Get total articles (existing + new)
        all_articles = self.existing_articles + self.articles
        
        for article in all_articles:
            source = article['source']
            sources[source] = sources.get(source, 0) + 1
            if article.get('scraped', False):
                scraped_count += 1
            total_content_length += article.get('content_length', len(article.get('content', '')))
        
        avg_length = total_content_length // len(all_articles) if all_articles else 0
        
        return {
            "total_articles": len(all_articles),
            "new_articles": len(self.articles),
            "fully_scraped": scraped_count,
            "sources_used": len(sources),
            "by_source": sources,
            "avg_content_length": avg_length,
            "latest_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }


def ingest_news(max_feeds: int | None = None, scrape_full: bool = True, days_back: int = 4) -> Dict:
    """Main function to ingest news from RSS feeds"""
    ingester = RSSIngester()
    articles = ingester.fetch_all(max_feeds=max_feeds, scrape_full=scrape_full, days_back=days_back)
    ingester.save()
    return ingester.get_stats()


if __name__ == "__main__":
    print("🚀 Starting RSS ingestion with full article scraping...\n")
    stats = ingest_news(scrape_full=True, days_back=4)
    print("\n" + "="*50)
    print("📊 Ingestion Statistics:")
    print(f"  New articles added: {stats['new_articles']}")
    print(f"  Total articles in DB: {stats['total_articles']}")
    print(f"  Fully scraped: {stats['fully_scraped']}")
    print(f"  Sources: {stats['sources_used']}")
    print(f"  Avg content length: {stats['avg_content_length']} chars")
    print(f"  Last update: {stats['latest_update']}")
    print("="*50)
