"""
Catalog of available news sources organized by country.
Each source has a name and RSS feed URL.
Users pick from this catalog; selections are persisted in selected_sources.json.
"""

SOURCES_BY_COUNTRY: dict[str, dict] = {
    "us": {
        "name": "United States",
        "flag": "🇺🇸",
        "sources": {
            "CNN": "http://rss.cnn.com/rss/edition.rss",
            "The New York Times": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
            "The Washington Post": "https://feeds.washingtonpost.com/rss/world",
            "Fox News": "https://moxie.foxnews.com/google-publisher/latest.xml",
            "NBC News": "https://feeds.nbcnews.com/nbcnews/public/news/world",
            "CBS News": "https://www.cbsnews.com/latest/rss/world",
            "ABC News": "https://abcnews.go.com/abcnews/topstories",
            "NPR": "https://feeds.npr.org/1001/rss.xml",
            "Associated Press": "https://rsshub.app/apnews/topics/apf-topnews",
            "Bloomberg": "https://www.bloomberg.com/feed/podcast/business.xml",
            "The Wall Street Journal": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
            "USA Today": "http://rssfeeds.usatoday.com/usatoday-NewsTopStories",
            "Politico": "https://rss.politico.com/politics-news.xml",
            "Reuters": "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
            "TechCrunch": "https://techcrunch.com/feed/",
            "Wired": "https://www.wired.com/feed/rss",
            "Ars Technica": "https://feeds.arstechnica.com/arstechnica/index",
            "The Verge": "https://www.theverge.com/rss/index.xml",
            "CNBC": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114",
            "TIME": "https://time.com/feed/",
        },
    },
    "gb": {
        "name": "United Kingdom",
        "flag": "🇬🇧",
        "sources": {
            "BBC News": "http://feeds.bbci.co.uk/news/rss.xml",
            "The Guardian": "https://www.theguardian.com/world/rss",
            "The Telegraph": "https://www.telegraph.co.uk/rss.xml",
            "Sky News": "https://feeds.skynews.com/feeds/rss/world.xml",
            "The Independent": "https://www.independent.co.uk/news/world/rss",
            "Daily Mail": "https://www.dailymail.co.uk/articles.rss",
            "Financial Times": "https://www.ft.com/world?format=rss",
            "Evening Standard": "https://www.standard.co.uk/rss",
            "Mirror": "https://www.mirror.co.uk/news/world-news/rss.xml",
            "Metro": "https://metro.co.uk/feed/",
            "ITV News": "https://www.itv.com/news/rss.xml",
            "The Sun": "https://www.thesun.co.uk/feed/",
            "The Times": "https://www.thetimes.co.uk/rss",
            "Express": "https://feeds.feedburner.com/daily-express-news-showbiz",
            "BBC Sport": "http://feeds.bbci.co.uk/sport/rss.xml",
        },
    },
    "ie": {
        "name": "Ireland",
        "flag": "🇮🇪",
        "sources": {
            "The Irish Times": "https://www.irishtimes.com/cmlink/news-1.1319192",
            "RTÉ News": "https://www.rte.ie/news/rss/news-headlines.xml",
            "Irish Independent": "https://www.independent.ie/rss/",
            "The Journal": "https://www.thejournal.ie/feed/",
            "Irish Examiner": "https://www.irishexaminer.com/cms_media/module_rss/619/index.rss",
            "Newstalk": "https://www.newstalk.com/feed",
            "BreakingNews.ie": "https://feeds.breakingnews.ie/bntopstories",
            "Dublin Live": "https://www.dublinlive.ie/news/?service=rss",
        },
    },
    "es": {
        "name": "Spain",
        "flag": "🇪🇸",
        "sources": {
            "El País": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
            "El Mundo": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
            "La Vanguardia": "https://www.lavanguardia.com/rss/home.xml",
            "ABC": "https://www.abc.es/rss/feeds/abc_ultima.xml",
            "20 Minutos": "https://www.20minutos.es/rss/",
            "El Confidencial": "https://rss.elconfidencial.com/espana/",
            "El Periódico": "https://www.elperiodico.com/es/rss/rss_portada.xml",
            "Público": "https://www.publico.es/rss",
            "RTVE": "https://www.rtve.es/api/noticias.rss",
            "Europa Press": "https://www.europapress.es/rss/rss.aspx",
        },
    },
}


def get_catalog() -> list[dict]:
    """Return the full catalog formatted for the frontend."""
    result = []
    for code, info in SOURCES_BY_COUNTRY.items():
        sources_list = [
            {"name": name, "rss_url": url}
            for name, url in info["sources"].items()
        ]
        result.append({
            "code": code,
            "name": info["name"],
            "flag": info["flag"],
            "sources": sources_list,
        })
    return result


def get_all_source_urls() -> dict[str, str]:
    """Flatten catalog into {name: rss_url} dict."""
    flat: dict[str, str] = {}
    for info in SOURCES_BY_COUNTRY.values():
        flat.update(info["sources"])
    return flat
