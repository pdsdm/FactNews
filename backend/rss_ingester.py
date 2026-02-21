import feedparser
import json
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict
from bs4 import BeautifulSoup
import re
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
        """Fetch and parse a single RSS feed"""
        articles = []
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        try:
            print(f"📡 Fetching {source}...")
            feed = feedparser.parse(url)
            
            for entry in feed.entries[:50]:  # Check up to 50 entries
                # Parse date first
                article_date = self.parse_date(entry)
                try:
                    article_datetime = datetime.strptime(article_date, "%Y-%m-%d")
                    if article_datetime < cutoff_date:
                        continue  # Skip old articles
                except:
                    pass  # If date parsing fails, include it anyway
                
                # Get content
                content = ""
                if hasattr(entry, 'summary'):
                    content = self.clean_html(entry.summary)
                elif hasattr(entry, 'description'):
                    content = self.clean_html(entry.description)
                elif hasattr(entry, 'content'):
                    content = self.clean_html(entry.content[0].value)
                
                # Skip if no content
                if not content or len(content) < 50:
                    continue
                
                # Build article
                article = {
                    "title": entry.get('title', 'Sin título'),
                    "source": source,
                    "url": entry.get('link', ''),
                    "date": article_date,
                    "content": content,
                    "scraped": False
                }
                
                # Deduplicate
                article_hash = self.get_content_hash(article['title'], article['url'])
                if article_hash not in self.seen_hashes:
                    self.seen_hashes.add(article_hash)
                    
                    # Scrape full content if enabled
                    if scrape_full:
                        article = enrich_article_content(article)
                    
                    articles.append(article)
                    
                    # Limit to 20 per source to keep it manageable
                    if len(articles) >= 20:
                        break
            
            print(f"  ✅ {source}: {len(articles)} artículos")
            
        except Exception as e:
            print(f"  ❌ Error fetching {source}: {str(e)}")
        
        return articles
    
    def fetch_all(self, max_feeds: int = None, scrape_full: bool = True, days_back: int = 4) -> List[Dict]:
        """Fetch from all RSS feeds"""
        self.articles = []
        self.seen_hashes = set()
        
        feeds = list(RSS_FEEDS.items())
        if max_feeds:
            feeds = feeds[:max_feeds]
        
        print(f"\n🔍 Fetching articles from last {days_back} days...\n")
        
        for source, url in feeds:
            articles = self.fetch_feed(source, url, scrape_full=scrape_full, days_back=days_back)
            self.articles.extend(articles)
        
        # Add IDs
        for idx, article in enumerate(self.articles, 1):
            article['id'] = idx
        
        return self.articles
    
    def save(self):
        """Save articles to JSON file"""
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(self.articles, f, ensure_ascii=False, indent=2)
        
        scraped_count = sum(1 for art in self.articles if art.get('scraped', False))
        print(f"\n💾 Saved {len(self.articles)} articles ({scraped_count} fully scraped) to {self.output_file}")
    
    def get_stats(self) -> Dict:
        """Get ingestion statistics"""
        sources = {}
        scraped_count = 0
        total_content_length = 0
        
        for article in self.articles:
            source = article['source']
            sources[source] = sources.get(source, 0) + 1
            if article.get('scraped', False):
                scraped_count += 1
            total_content_length += article.get('content_length', len(article.get('content', '')))
        
        avg_length = total_content_length // len(self.articles) if self.articles else 0
        
        return {
            "total_articles": len(self.articles),
            "fully_scraped": scraped_count,
            "sources": len(sources),
            "by_source": sources,
            "avg_content_length": avg_length,
            "latest_update": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }


def ingest_news(max_feeds: int = None, scrape_full: bool = True, days_back: int = 4) -> Dict:
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
    print(f"  Total articles: {stats['total_articles']}")
    print(f"  Fully scraped: {stats['fully_scraped']}")
    print(f"  Sources: {stats['sources']}")
    print(f"  Avg content length: {stats['avg_content_length']} chars")
    print(f"  Last update: {stats['latest_update']}")
    print("="*50)
