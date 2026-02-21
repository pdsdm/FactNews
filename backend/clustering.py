import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
from collections import defaultdict

class ArticleClusterer:
    """Groups similar articles together to detect same story from different sources"""
    
    def __init__(self, similarity_threshold: float = 0.3):
        self.similarity_threshold = similarity_threshold
        self.vectorizer = TfidfVectorizer(
            max_features=500,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    def find_similar_groups(self, articles: List[Dict]) -> List[List[Dict]]:
        """
        Group articles that talk about the same story
        Returns list of groups, each group contains similar articles
        """
        if len(articles) < 2:
            return [[art] for art in articles]
        
        # Create text representations
        texts = [f"{art['title']} {art['content'][:500]}" for art in articles]
        
        # Calculate TF-IDF vectors
        try:
            tfidf_matrix = self.vectorizer.fit_transform(texts)
        except:
            # Fallback if vectorization fails
            return [[art] for art in articles]
        
        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(tfidf_matrix)
        
        # Group articles by similarity
        visited = set()
        groups = []
        
        for i in range(len(articles)):
            if i in visited:
                continue
            
            # Start new group
            group = [articles[i]]
            visited.add(i)
            
            # Find similar articles
            for j in range(i + 1, len(articles)):
                if j in visited:
                    continue
                
                if similarity_matrix[i][j] >= self.similarity_threshold:
                    group.append(articles[j])
                    visited.add(j)
            
            groups.append(group)
        
        # Sort groups by size (biggest first)
        groups.sort(key=lambda g: len(g), reverse=True)
        
        return groups
    
    def get_story_clusters(self, articles: List[Dict]) -> List[Dict]:
        """
        Get clustered stories with metadata
        """
        groups = self.find_similar_groups(articles)
        
        clusters = []
        for idx, group in enumerate(groups):
            # Get common theme
            sources = [art['source'] for art in group]
            
            cluster = {
                "cluster_id": idx,
                "article_count": len(group),
                "sources": sources,
                "unique_sources": len(set(sources)),
                "articles": group,
                "representative_title": group[0]['title'],  # Most relevant
                "urls": [art['url'] for art in group]
            }
            
            clusters.append(cluster)
        
        return clusters


def detect_bias_in_cluster(cluster: Dict, provider=None) -> Dict:
    """
    Use LLM to detect how different sources cover the same story.

    Args:
        cluster: A cluster dict with 'articles' key.
        provider: An InferenceProvider instance (or None to use default).
    """
    if provider is None:
        from inference import get_provider
        provider = get_provider("crusoe")

    articles = cluster['articles']

    if len(articles) < 2:
        return {"bias_detected": False, "coverage": "single_source"}

    # Build prompt to detect bias
    context = "\n\n".join([
        f"[{art['source']}]\nTitle: {art['title']}\nContent: {art['content'][:800]}"
        for art in articles[:5]  # Max 5 sources
    ])

    prompt = f"""Analyze how different media outlets report the same story. Identify:

1. COMMON FACTS (agreed upon by all sources)
2. DIFFERENCES IN FOCUS (what aspects each outlet emphasizes)
3. POSSIBLE BIASES (tone, emotional language, omitted information)

News articles:
{context}

Respond in JSON:
{{
  "common_facts": ["fact1", "fact2", ...],
  "divergences": [
    {{"source": "X", "emphasis": "...", "tone": "neutral/positive/negative"}}
  ],
  "bias_analysis": "Brief explanation of detected biases",
  "consensus_level": 0.0-1.0
}}"""

    try:
        import json
        response = provider.complete(
            messages=[
                {"role": "system", "content": "You are an expert in media analysis and journalistic bias detection."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            json_mode=True,
        )
        return json.loads(response.content)

    except Exception as e:
        print(f"Error in bias detection: {e}")
        return {"bias_detected": False, "error": str(e)}
