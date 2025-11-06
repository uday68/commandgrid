import re
from typing import Dict, List, Set
from ..exceptions import SecurityError

class SecurityManager:
    def __init__(self):
        self.patterns = {
            "credit_card": r"\b\d{16}\b",
            "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "ssn": r"\b\d{3}[-]?\d{2}[-]?\d{4}\b",
            "api_key": r"\b[A-Za-z0-9]{32,}\b",
            "password": r"\bpassword\s*[=:]\s*[^\s]+\b"
        }
        
        self.sensitive_keywords: Set[str] = {
            "password", "secret", "key", "token", "credential",
            "api_key", "private_key", "ssh_key", "access_token"
        }
        
        self.blocked_patterns: List[str] = [
            r"<script.*?>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"eval\s*\(",
            r"document\.cookie"
        ]
        
    def sanitize_input(self, text: str) -> str:
        """Sanitize input text by removing sensitive information."""
        try:
            # Remove sensitive patterns
            for pattern in self.patterns.values():
                text = re.sub(pattern, "[REDACTED]", text, flags=re.IGNORECASE)
                
            # Check for sensitive keywords
            words = text.split()
            for i, word in enumerate(words):
                if word.lower() in self.sensitive_keywords:
                    words[i] = "[REDACTED]"
                    
            # Remove potentially malicious patterns
            for pattern in self.blocked_patterns:
                text = re.sub(pattern, "", text, flags=re.IGNORECASE)
                
            return " ".join(words)
            
        except Exception as e:
            raise SecurityError(f"Error sanitizing input: {str(e)}")
            
    def validate_request(self, request: Dict) -> bool:
        """Validate request data for security concerns."""
        try:
            # Check for required fields
            required_fields = ["query", "user_id"]
            if not all(field in request for field in required_fields):
                return False
                
            # Validate query length
            if len(request["query"]) > 10000:  # Maximum query length
                return False
                
            # Check for malicious content
            if self._contains_malicious_content(request["query"]):
                return False
                
            return True
            
        except Exception as e:
            raise SecurityError(f"Error validating request: {str(e)}")
            
    def _contains_malicious_content(self, text: str) -> bool:
        """Check if text contains potentially malicious content."""
        # Check for SQL injection patterns
        sql_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)",
            r"(--|\b(OR|AND)\b\s+\d+\s*=\s*\d+)",
            r"(\b(EXEC|EXECUTE|DECLARE)\b)"
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
                
        # Check for XSS patterns
        xss_patterns = [
            r"<script.*?>",
            r"javascript:",
            r"on\w+\s*=",
            r"eval\s*\(",
            r"document\.cookie"
        ]
        
        for pattern in xss_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
                
        return False
        
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key format and structure."""
        if not api_key:
            return False
            
        # Check API key format (example for a specific format)
        if not re.match(r"^[A-Za-z0-9]{32,}$", api_key):
            return False
            
        return True 