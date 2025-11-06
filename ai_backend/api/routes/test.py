from flask import Blueprint, jsonify
from ..services.enhanced_ai_service import EnhancedAIService

test_bp = Blueprint('test', __name__)
ai_service = EnhancedAIService()

@test_bp.route('/hello', methods=['GET'])
def hello():
    try:
        response = ai_service.process_query("hello")
        return jsonify({
            "status": "success",
            "message": "AI Backend is working",
            "response": response
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500 