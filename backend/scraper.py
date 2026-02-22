import trafilatura
import requests
from newspaper import Article
from typing import Optional
import time
import signal

# Timeout decorator for individual scrape attempts
class _ScrapeTimeout(Exception):
    pass

class FullArticleScraper:
    """Scrapes full article content from URLs"""
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    
    def scrape_with_trafilatura(self, url: str) -> Optional[str]:
        """Try scraping with trafilatura (fast and reliable)"""
        try:
            # Use requests with explicit timeout first, then extract
            resp = requests.get(
                url,
                timeout=self.timeout,
                headers={"User-Agent": self.user_agent},
                allow_redirects=True,
            )
            resp.raise_for_status()
            text = trafilatura.extract(
                resp.text,
                include_comments=False,
                include_tables=False,
                no_fallback=True,  # avoid slow fallback parsers
            )
            return text
        except requests.exceptions.Timeout:
            print(f"    ⏱️  Trafilatura timeout ({self.timeout}s): {url[:60]}")
        except requests.exceptions.ConnectionError:
            print(f"    ⚠️  Connection error: {url[:60]}")
        except Exception as e:
            print(f"    ⚠️  Trafilatura failed: {str(e)[:50]}")
        return None
    
    def scrape_with_newspaper(self, url: str) -> Optional[str]:
        """Try scraping with newspaper3k (good for news sites)"""
        try:
            article = Article(url, request_timeout=self.timeout)
            article.download()
            article.parse()
            
            if article.text and len(article.text) > 200:
                return article.text
        except Exception as e:
            print(f"    ⚠️  Newspaper3k failed: {str(e)[:50]}")
        return None
    
    def scrape_full_article(self, url: str) -> Optional[str]:
        """
        Scrape full article content using multiple methods.
        Each method has its own timeout so nothing hangs.
        """
        # Method 1: Trafilatura with requests (has timeout)
        content = self.scrape_with_trafilatura(url)
        if content and len(content) > 500:
            return content
        
        # Method 2: Newspaper3k (has timeout via request_timeout)
        content = self.scrape_with_newspaper(url)
        if content and len(content) > 500:
            return content
        
        return None


def enrich_article_content(article: dict) -> dict:
    """
    Enrich RSS article with full scraped content
    """
    scraper = FullArticleScraper()
    
    print(f"  📄 Scraping: {article['title'][:60]}...")
    
    full_content = scraper.scrape_full_article(article['url'])
    
    if full_content:
        article['content'] = full_content  # FULL CONTENT, no trimming
        article['scraped'] = True
        article['content_length'] = len(full_content)
        print(f"    ✅ Scraped {len(full_content)} chars")
    else:
        article['scraped'] = False
        print(f"    ⚠️  Using RSS summary only")
    
    time.sleep(0.1)  # Small delay to be polite to servers
    
    return article
