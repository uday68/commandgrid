from typing import Dict, Any, Optional
from dataclasses import dataclass
from fastapi import HTTPException, status
import traceback
import logging

@dataclass
class ErrorInfo:
    status_code: int
    message: str
    error_type: str
    details: Optional[Dict[str, Any]] = None

class AIErrorHandler:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.error_mapping = {
            'timeout': ErrorInfo(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                message="Request timed out. Please try again.",
                error_type="timeout"
            ),
            'rate_limit': ErrorInfo(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                message="Rate limit exceeded. Please try again later.",
                error_type="rate_limit"
            ),
            'token_limit': ErrorInfo(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                message="Insufficient tokens. Please upgrade your plan.",
                error_type="token_limit"
            ),
            'model_error': ErrorInfo(
                status_code=status.HTTP_502_BAD_GATEWAY,
                message="AI model error. Please try again.",
                error_type="model_error"
            ),
            'validation_error': ErrorInfo(
                status_code=status.HTTP_400_BAD_REQUEST,
                message="Invalid request parameters.",
                error_type="validation_error"
            ),
            'authentication_error': ErrorInfo(
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Authentication failed.",
                error_type="authentication_error"
            ),
            'authorization_error': ErrorInfo(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Not authorized to perform this action.",
                error_type="authorization_error"
            ),
            'internal_error': ErrorInfo(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Internal server error. Please try again later.",
                error_type="internal_error"
            )
        }

    def handle_error(self, error: Exception) -> ErrorInfo:
        """Handle and classify errors"""
        try:
            # Log the error
            self.logger.error(f"Error occurred: {str(error)}")
            self.logger.error(traceback.format_exc())

            # Classify the error
            if isinstance(error, HTTPException):
                return self._handle_http_error(error)
            elif isinstance(error, TimeoutError):
                return self.error_mapping['timeout']
            elif isinstance(error, ValueError):
                return self._handle_validation_error(error)
            elif isinstance(error, PermissionError):
                return self.error_mapping['authorization_error']
            elif isinstance(error, ConnectionError):
                return self._handle_connection_error(error)
            else:
                return self._handle_unknown_error(error)

        except Exception as e:
            self.logger.error(f"Error in error handler: {str(e)}")
            return self.error_mapping['internal_error']

    def _handle_http_error(self, error: HTTPException) -> ErrorInfo:
        """Handle HTTP exceptions"""
        error_type = 'internal_error'
        if error.status_code == 429:
            error_type = 'rate_limit'
        elif error.status_code == 401:
            error_type = 'authentication_error'
        elif error.status_code == 403:
            error_type = 'authorization_error'
        elif error.status_code == 400:
            error_type = 'validation_error'
        elif error.status_code == 504:
            error_type = 'timeout'

        return ErrorInfo(
            status_code=error.status_code,
            message=str(error.detail),
            error_type=error_type,
            details={'status_code': error.status_code}
        )

    def _handle_validation_error(self, error: ValueError) -> ErrorInfo:
        """Handle validation errors"""
        return ErrorInfo(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=str(error),
            error_type='validation_error',
            details={'error': str(error)}
        )

    def _handle_connection_error(self, error: ConnectionError) -> ErrorInfo:
        """Handle connection errors"""
        return ErrorInfo(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            message="Service temporarily unavailable. Please try again later.",
            error_type='connection_error',
            details={'error': str(error)}
        )

    def _handle_unknown_error(self, error: Exception) -> ErrorInfo:
        """Handle unknown errors"""
        return ErrorInfo(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="An unexpected error occurred. Please try again later.",
            error_type='internal_error',
            details={
                'error': str(error),
                'type': type(error).__name__
            }
        )

    def get_error_info(self, error_type: str) -> Optional[ErrorInfo]:
        """Get error information by type"""
        return self.error_mapping.get(error_type)

    def log_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """Log error with context"""
        try:
            error_info = self.handle_error(error)
            log_data = {
                'error_type': error_info.error_type,
                'message': error_info.message,
                'status_code': error_info.status_code,
                'details': error_info.details
            }
            
            if context:
                log_data['context'] = context
                
            self.logger.error(f"Error logged: {log_data}")
            
        except Exception as e:
            self.logger.error(f"Error in error logging: {str(e)}")

    def format_error_response(self, error_info: ErrorInfo) -> Dict[str, Any]:
        """Format error response for API"""
        return {
            'error': {
                'type': error_info.error_type,
                'message': error_info.message,
                'details': error_info.details
            },
            'status_code': error_info.status_code
        } 