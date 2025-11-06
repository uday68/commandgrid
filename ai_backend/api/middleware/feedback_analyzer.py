from typing import Dict, Any, Optional, List
import redis.asyncio as redis
import json
import logging
from datetime import datetime, timedelta
from collections import defaultdict

class FeedbackAnalyzer:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.logger = logging.getLogger(__name__)
        self.feedback_ttl = 2592000  # 30 days

    async def analyze_feedback(self, conversation_id: str, feedback: Dict[str, Any]) -> None:
        """Analyze and store user feedback"""
        try:
            # Prepare feedback data
            feedback_data = {
                'conversation_id': conversation_id,
                'timestamp': datetime.utcnow().isoformat(),
                'rating': feedback.get('rating'),
                'comment': feedback.get('comment'),
                'categories': feedback.get('categories', []),
                'sentiment': await self._analyze_sentiment(feedback.get('comment', '')),
                'improvement_areas': await self._identify_improvement_areas(feedback),
                'action_items': await self._generate_action_items(feedback)
            }

            # Store feedback
            await self._store_feedback(feedback_data)

            # Update metrics
            await self._update_feedback_metrics(feedback_data)

            # Generate insights if needed
            if feedback.get('rating', 0) < 4:  # Low rating
                await self._generate_improvement_insights(feedback_data)

        except Exception as e:
            self.logger.error(f"Error analyzing feedback: {str(e)}")
            raise

    async def _analyze_sentiment(self, comment: str) -> Dict[str, Any]:
        """Analyze sentiment of feedback comment"""
        try:
            # Simple sentiment analysis
            positive_words = {'good', 'great', 'excellent', 'helpful', 'useful', 'awesome', 'amazing'}
            negative_words = {'bad', 'poor', 'terrible', 'useless', 'unhelpful', 'awful', 'horrible'}

            words = comment.lower().split()
            positive_count = sum(1 for word in words if word in positive_words)
            negative_count = sum(1 for word in words if word in negative_words)

            total = positive_count + negative_count
            if total == 0:
                sentiment_score = 0
            else:
                sentiment_score = (positive_count - negative_count) / total

            return {
                'score': sentiment_score,
                'positive_count': positive_count,
                'negative_count': negative_count,
                'is_positive': sentiment_score > 0,
                'is_negative': sentiment_score < 0,
                'is_neutral': sentiment_score == 0
            }

        except Exception as e:
            self.logger.error(f"Error analyzing sentiment: {str(e)}")
            return {
                'score': 0,
                'positive_count': 0,
                'negative_count': 0,
                'is_positive': False,
                'is_negative': False,
                'is_neutral': True
            }

    async def _identify_improvement_areas(self, feedback: Dict[str, Any]) -> List[str]:
        """Identify areas for improvement from feedback"""
        try:
            improvement_areas = []
            comment = feedback.get('comment', '').lower()
            categories = feedback.get('categories', [])

            # Check for common improvement areas
            if 'accuracy' in categories or 'incorrect' in comment:
                improvement_areas.append('response_accuracy')
            if 'speed' in categories or 'slow' in comment:
                improvement_areas.append('response_speed')
            if 'clarity' in categories or 'unclear' in comment:
                improvement_areas.append('response_clarity')
            if 'relevance' in categories or 'irrelevant' in comment:
                improvement_areas.append('response_relevance')
            if 'completeness' in categories or 'incomplete' in comment:
                improvement_areas.append('response_completeness')

            return improvement_areas

        except Exception as e:
            self.logger.error(f"Error identifying improvement areas: {str(e)}")
            return []

    async def _generate_action_items(self, feedback: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate action items from feedback"""
        try:
            action_items = []
            improvement_areas = await self._identify_improvement_areas(feedback)

            for area in improvement_areas:
                action_item = {
                    'area': area,
                    'priority': 'high' if feedback.get('rating', 0) < 3 else 'medium',
                    'description': self._get_action_description(area),
                    'status': 'pending',
                    'created_at': datetime.utcnow().isoformat()
                }
                action_items.append(action_item)

            return action_items

        except Exception as e:
            self.logger.error(f"Error generating action items: {str(e)}")
            return []

    def _get_action_description(self, area: str) -> str:
        """Get description for action item based on area"""
        descriptions = {
            'response_accuracy': 'Improve response accuracy and fact-checking',
            'response_speed': 'Optimize response generation speed',
            'response_clarity': 'Enhance response clarity and readability',
            'response_relevance': 'Improve response relevance to user queries',
            'response_completeness': 'Ensure comprehensive and complete responses'
        }
        return descriptions.get(area, 'Address feedback in specified area')

    async def _store_feedback(self, feedback_data: Dict[str, Any]) -> None:
        """Store feedback data"""
        try:
            if not self.redis:
                return

            # Store feedback
            key = f"feedback:{feedback_data['conversation_id']}"
            await self.redis.setex(
                key,
                self.feedback_ttl,
                json.dumps(feedback_data)
            )

            # Add to feedback list
            await self.redis.rpush('feedback_list', key)

        except Exception as e:
            self.logger.error(f"Error storing feedback: {str(e)}")

    async def _update_feedback_metrics(self, feedback_data: Dict[str, Any]) -> None:
        """Update feedback metrics"""
        try:
            if not self.redis:
                return

            # Update rating distribution
            rating = feedback_data['rating']
            await self.redis.hincrby('feedback_metrics:ratings', str(rating), 1)

            # Update category distribution
            for category in feedback_data['categories']:
                await self.redis.hincrby('feedback_metrics:categories', category, 1)

            # Update sentiment distribution
            sentiment = 'positive' if feedback_data['sentiment']['is_positive'] else 'negative' if feedback_data['sentiment']['is_negative'] else 'neutral'
            await self.redis.hincrby('feedback_metrics:sentiment', sentiment, 1)

        except Exception as e:
            self.logger.error(f"Error updating feedback metrics: {str(e)}")

    async def _generate_improvement_insights(self, feedback_data: Dict[str, Any]) -> None:
        """Generate insights for improvement"""
        try:
            if not self.redis:
                return

            insights = {
                'conversation_id': feedback_data['conversation_id'],
                'timestamp': datetime.utcnow().isoformat(),
                'rating': feedback_data['rating'],
                'improvement_areas': feedback_data['improvement_areas'],
                'action_items': feedback_data['action_items'],
                'sentiment': feedback_data['sentiment'],
                'priority': 'high' if feedback_data['rating'] < 3 else 'medium'
            }

            # Store insights
            key = f"improvement_insights:{feedback_data['conversation_id']}"
            await self.redis.setex(
                key,
                self.feedback_ttl,
                json.dumps(insights)
            )

            # Add to insights list
            await self.redis.rpush('improvement_insights_list', key)

        except Exception as e:
            self.logger.error(f"Error generating improvement insights: {str(e)}")

    async def get_feedback_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get feedback metrics for the last N days"""
        try:
            if not self.redis:
                return {}

            metrics = {
                'total_feedback': 0,
                'average_rating': 0,
                'rating_distribution': {},
                'category_distribution': {},
                'sentiment_distribution': {},
                'improvement_areas': defaultdict(int),
                'trends': {
                    'ratings': [],
                    'sentiment': [],
                    'categories': []
                }
            }

            # Get feedback from the last N days
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            feedback_list = await self.redis.lrange('feedback_list', 0, -1)

            total_rating = 0
            feedback_count = 0

            for feedback_key in feedback_list:
                feedback_data = await self.redis.get(feedback_key)
                if feedback_data:
                    feedback = json.loads(feedback_data)
                    feedback_date = datetime.fromisoformat(feedback['timestamp'])

                    if feedback_date >= cutoff_date:
                        metrics['total_feedback'] += 1
                        total_rating += feedback['rating']
                        feedback_count += 1

                        # Update distributions
                        metrics['rating_distribution'][str(feedback['rating'])] = metrics['rating_distribution'].get(str(feedback['rating']), 0) + 1
                        
                        for category in feedback['categories']:
                            metrics['category_distribution'][category] = metrics['category_distribution'].get(category, 0) + 1

                        sentiment = 'positive' if feedback['sentiment']['is_positive'] else 'negative' if feedback['sentiment']['is_negative'] else 'neutral'
                        metrics['sentiment_distribution'][sentiment] = metrics['sentiment_distribution'].get(sentiment, 0) + 1

                        for area in feedback['improvement_areas']:
                            metrics['improvement_areas'][area] += 1

            # Calculate average rating
            if feedback_count > 0:
                metrics['average_rating'] = total_rating / feedback_count

            return metrics

        except Exception as e:
            self.logger.error(f"Error getting feedback metrics: {str(e)}")
            return {}

    async def get_improvement_insights(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent improvement insights"""
        try:
            if not self.redis:
                return []

            insights = []
            insight_keys = await self.redis.lrange('improvement_insights_list', 0, limit - 1)

            for key in insight_keys:
                insight_data = await self.redis.get(key)
                if insight_data:
                    insights.append(json.loads(insight_data))

            return insights

        except Exception as e:
            self.logger.error(f"Error getting improvement insights: {str(e)}")
            return [] 