import trafilatura
import requests
from newspaper import Article
from bs4 import BeautifulSoup
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
    
    def _extract_og_image(self, html: str) -> str:
        """Extract og:image / twitter:image from HTML."""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            for attr in [('property', 'og:image'), ('name', 'og:image'), ('name', 'twitter:image')]:
                tag = soup.find('meta', attrs={attr[0]: attr[1]})
                if tag:
                    url = tag.get('content', '') or tag.get('value', '')
                    if url and url.startswith('http'):
                        return url
        except Exception:
            pass
        return ''

    def scrape_with_trafilatura(self, url: str) -> tuple[Optional[str], str]:
        """Returns (content, image_url)"""
        try:
            resp = requests.get(
                url,
                timeout=self.timeout,
                headers={"User-Agent": self.user_agent},
                allow_redirects=True,
            )
            resp.raise_for_status()
            image_url = self._extract_og_image(resp.text)
            text = trafilatura.extract(
                resp.text,
                include_comments=False,
                include_tables=False,
                no_fallback=True,
            )
            return text, image_url
        except requests.exceptions.Timeout:
            print(f"    ⏱️  Trafilatura timeout ({self.timeout}s): {url[:60]}")
        except requests.exceptions.ConnectionError:
            print(f"    ⚠️  Connection error: {url[:60]}")
        except Exception as e:
            print(f"    ⚠️  Trafilatura failed: {str(e)[:50]}")
        return None, ''

    def scrape_with_newspaper(self, url: str) -> tuple[Optional[str], str]:
        """Returns (content, image_url)"""
        try:
            article = Article(url, request_timeout=self.timeout)
            article.download()
            article.parse()
            if article.text and len(article.text) > 200:
                return article.text, (article.top_image or '')
        except Exception as e:
            print(f"    ⚠️  Newspaper3k failed: {str(e)[:50]}")
        return None, ''

    def scrape_full_article(self, url: str) -> tuple[Optional[str], str]:
        """
        Scrape full article content using multiple methods.
        Returns (content, image_url).
        """
        # Method 1: Trafilatura with requests (has timeout)
        content, image_url = self.scrape_with_trafilatura(url)
        if content and len(content) > 500:
            return content, image_url

        # Method 2: Newspaper3k (has timeout via request_timeout)
        content, image_url = self.scrape_with_newspaper(url)
        if content and len(content) > 500:
            return content, image_url

        return None, ''


def enrich_article_content(article: dict) -> dict:
    """
    Enrich RSS article with full scraped content
    """
    scraper = FullArticleScraper()
    
    print(f"  📄 Scraping: {article['title'][:60]}...")
    
    full_content, image_url = scraper.scrape_full_article(article['url'])
    
    if full_content:
        article['content'] = full_content
        article['scraped'] = True
        article['content_length'] = len(full_content)
        print(f"    ✅ Scraped {len(full_content)} chars")
    else:
        article['scraped'] = False
        print(f"    ⚠️  Using RSS summary only")

    if image_url and not article.get('image_url'):
        article['image_url'] = image_url

    time.sleep(0.1)
    return article
