#!/usr/bin/env python3
"""
Comprehensive unit tests for the greeting module.

This test suite demonstrates best practices for testing including:
- Comprehensive test coverage
- Edge case testing
- Error condition testing
- Parameterized tests
- Mocking and fixtures
- Performance testing
"""

import pytest
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime
import sys
import os

# Add the examples directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'examples', 'python'))

from greeting_module import (
    GreetingService, 
    GreetingConfig, 
    Language
)


class TestLanguageEnum(unittest.TestCase):
    """Test cases for the Language enum."""
    
    def test_language_values(self):
        """Test that all language enum values are correct."""
        expected_languages = {
            Language.ENGLISH: "en",
            Language.RUSSIAN: "ru",
            Language.SPANISH: "es",
            Language.FRENCH: "fr",
            Language.GERMAN: "de"
        }
        
        for lang, expected_value in expected_languages.items():
            self.assertEqual(lang.value, expected_value)
    
    def test_language_count(self):
        """Test that we have the expected number of languages."""
        self.assertEqual(len(Language), 5)


class TestGreetingConfig(unittest.TestCase):
    """Test cases for the GreetingConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = GreetingConfig()
        
        self.assertEqual(config.language, Language.ENGLISH)
        self.assertFalse(config.include_timestamp)
        self.assertEqual(config.custom_greetings, {})
        self.assertEqual(config.max_name_length, 100)
    
    def test_custom_config(self):
        """Test custom configuration values."""
        custom_greetings = {"en": "Hi, {name}!"}
        config = GreetingConfig(
            language=Language.RUSSIAN,
            include_timestamp=True,
            custom_greetings=custom_greetings,
            max_name_length=50
        )
        
        self.assertEqual(config.language, Language.RUSSIAN)
        self.assertTrue(config.include_timestamp)
        self.assertEqual(config.custom_greetings, custom_greetings)
        self.assertEqual(config.max_name_length, 50)
    
    def test_invalid_max_name_length(self):
        """Test that invalid max_name_length raises ValueError."""
        with self.assertRaises(ValueError):
            GreetingConfig(max_name_length=0)
        
        with self.assertRaises(ValueError):
            GreetingConfig(max_name_length=-1)
        
        with self.assertRaises(ValueError):
            GreetingConfig(max_name_length=1001)


class TestGreetingService(unittest.TestCase):
    """Comprehensive test cases for the GreetingService class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = GreetingService()
        self.ru_service = GreetingService(GreetingConfig(language=Language.RUSSIAN))
    
    def test_initialization_default(self):
        """Test service initialization with default config."""
        service = GreetingService()
        self.assertEqual(service.config.language, Language.ENGLISH)
        self.assertFalse(service.config.include_timestamp)
    
    def test_initialization_with_config(self):
        """Test service initialization with custom config."""
        config = GreetingConfig(language=Language.SPANISH)
        service = GreetingService(config)
        self.assertEqual(service.config.language, Language.SPANISH)
    
    def test_initialization_invalid_config(self):
        """Test that invalid config raises TypeError."""
        with self.assertRaises(TypeError):
            GreetingService("invalid config")
        
        with self.assertRaises(TypeError):
            GreetingService(123)
    
    def test_basic_greeting_default_name(self):
        """Test basic greeting with default name."""
        result = self.service.greet()
        self.assertEqual(result, "Hello, World!")
    
    def test_basic_greeting_custom_name(self):
        """Test basic greeting with custom name."""
        result = self.service.greet("Alice")
        self.assertEqual(result, "Hello, Alice!")
    
    def test_greeting_different_languages(self):
        """Test greetings in different languages."""
        test_cases = [
            (Language.ENGLISH, "Hello, Alice!"),
            (Language.RUSSIAN, "Привет, Alice!"),
            (Language.SPANISH, "¡Hola, Alice!"),
            (Language.FRENCH, "Bonjour, Alice!"),
            (Language.GERMAN, "Hallo, Alice!")
        ]
        
        for language, expected in test_cases:
            config = GreetingConfig(language=language)
            service = GreetingService(config)
            result = service.greet("Alice")
            self.assertEqual(result, expected)
    
    def test_greeting_with_whitespace(self):
        """Test greeting with names containing whitespace."""
        test_cases = [
            "  Alice  ",  # Leading/trailing spaces
            "Alice Bob",  # Space in name
            "\tAlice\n",  # Tab and newline
        ]
        
        for name in test_cases:
            result = self.service.greet(name)
            clean_name = name.strip()
            expected = f"Hello, {clean_name}!"
            self.assertEqual(result, expected)
    
    def test_greeting_empty_name_error(self):
        """Test that empty name raises ValueError."""
        with self.assertRaises(ValueError) as context:
            self.service.greet("")
        
        self.assertIn("name cannot be empty", str(context.exception))
        
        with self.assertRaises(ValueError):
            self.service.greet("   ")  # Only whitespace
    
    def test_greeting_non_string_name_error(self):
        """Test that non-string name raises TypeError."""
        invalid_names = [123, None, [], {}, True]
        
        for invalid_name in invalid_names:
            with self.assertRaises(TypeError) as context:
                self.service.greet(invalid_name)
            
            self.assertIn("name must be a string", str(context.exception))
    
    def test_greeting_name_too_long_error(self):
        """Test that name exceeding max length raises ValueError."""
        config = GreetingConfig(max_name_length=10)
        service = GreetingService(config)
        
        long_name = "a" * 11  # 11 characters, max is 10
        
        with self.assertRaises(ValueError) as context:
            service.greet(long_name)
        
        self.assertIn("name length", str(context.exception))
        self.assertIn("exceeds maximum", str(context.exception))
    
    @patch('examples.python.greeting_module.datetime')
    def test_greeting_with_timestamp(self, mock_datetime):
        """Test greeting with timestamp enabled."""
        # Mock datetime
        mock_now = MagicMock()
        mock_now.strftime.return_value = "2023-01-01 12:00:00"
        mock_datetime.now.return_value = mock_now
        
        config = GreetingConfig(include_timestamp=True)
        service = GreetingService(config)
        
        result = service.greet("Alice")
        expected = "Hello, Alice! [Generated at 2023-01-01 12:00:00]"
        self.assertEqual(result, expected)
        
        # Verify datetime.now was called
        mock_datetime.now.assert_called_once()
        mock_now.strftime.assert_called_once_with("%Y-%m-%d %H:%M:%S")
    
    def test_custom_greeting_template(self):
        """Test setting and using custom greeting template."""
        self.service.set_custom_greeting(Language.ENGLISH, "Welcome, {name}!")
        result = self.service.greet("Alice")
        self.assertEqual(result, "Welcome, Alice!")
    
    def test_set_custom_greeting_invalid_language(self):
        """Test that invalid language type raises TypeError."""
        with self.assertRaises(TypeError):
            self.service.set_custom_greeting("en", "Hi, {name}!")
    
    def test_set_custom_greeting_invalid_template_type(self):
        """Test that invalid template type raises TypeError."""
        with self.assertRaises(TypeError):
            self.service.set_custom_greeting(Language.ENGLISH, 123)
    
    def test_set_custom_greeting_missing_placeholder(self):
        """Test that template without {name} placeholder raises ValueError."""
        with self.assertRaises(ValueError) as context:
            self.service.set_custom_greeting(Language.ENGLISH, "Hello there!")
        
        self.assertIn("template must contain {name} placeholder", str(context.exception))
    
    def test_get_supported_languages(self):
        """Test getting list of supported languages."""
        languages = self.service.get_supported_languages()
        
        self.assertIsInstance(languages, list)
        self.assertEqual(len(languages), 5)
        self.assertIn(Language.ENGLISH, languages)
        self.assertIn(Language.RUSSIAN, languages)
        self.assertIn(Language.SPANISH, languages)
        self.assertIn(Language.FRENCH, languages)
        self.assertIn(Language.GERMAN, languages)
    
    def test_repr(self):
        """Test string representation of service."""
        expected = "GreetingService(language=en, include_timestamp=False)"
        self.assertEqual(repr(self.service), expected)
        
        config = GreetingConfig(language=Language.RUSSIAN, include_timestamp=True)
        ru_service = GreetingService(config)
        expected_ru = "GreetingService(language=ru, include_timestamp=True)"
        self.assertEqual(repr(ru_service), expected_ru)
    
    def test_greeting_template_fallback(self):
        """Test fallback to English when language not in default greetings."""
        # This test would be more relevant if we had a language not in DEFAULT_GREETINGS
        # For now, test that all supported languages have templates
        for language in Language:
            config = GreetingConfig(language=language)
            service = GreetingService(config)
            result = service.greet("Test")
            self.assertIn("Test", result)
            self.assertTrue(len(result) > 4)  # Should be more than just "Test"


class TestGreetingServicePerformance(unittest.TestCase):
    """Performance tests for the GreetingService."""
    
    def test_greeting_performance(self):
        """Test that greeting generation is reasonably fast."""
        import time
        
        service = GreetingService()
        
        # Test single greeting performance
        start_time = time.perf_counter()
        service.greet("Alice")
        end_time = time.perf_counter()
        
        # Should complete in less than 10ms
        self.assertLess(end_time - start_time, 0.01)
    
    def test_bulk_greeting_performance(self):
        """Test performance with multiple greetings."""
        import time
        
        service = GreetingService()
        names = [f"User{i}" for i in range(1000)]
        
        start_time = time.perf_counter()
        for name in names:
            service.greet(name)
        end_time = time.perf_counter()
        
        # 1000 greetings should complete in less than 1 second
        self.assertLess(end_time - start_time, 1.0)


class TestGreetingServiceIntegration(unittest.TestCase):
    """Integration tests for the GreetingService."""
    
    def test_end_to_end_workflow(self):
        """Test complete workflow with various configurations."""
        # Create service with custom config
        config = GreetingConfig(
            language=Language.SPANISH,
            include_timestamp=False,
            max_name_length=50
        )
        service = GreetingService(config)
        
        # Test basic greeting
        result = service.greet("María")
        self.assertEqual(result, "¡Hola, María!")
        
        # Add custom greeting
        service.set_custom_greeting(Language.SPANISH, "Bienvenido, {name}!")
        result = service.greet("Carlos")
        self.assertEqual(result, "Bienvenido, Carlos!")
        
        # Test supported languages
        languages = service.get_supported_languages()
        self.assertIn(Language.SPANISH, languages)
    
    def test_error_recovery(self):
        """Test that service continues to work after errors."""
        service = GreetingService()
        
        # Cause an error
        try:
            service.greet("")
        except ValueError:
            pass
        
        # Service should still work normally
        result = service.greet("Alice")
        self.assertEqual(result, "Hello, Alice!")
    
    @patch('examples.python.greeting_module.logger')
    def test_logging_integration(self, mock_logger):
        """Test that logging works correctly."""
        service = GreetingService()
        service.greet("Alice")
        
        # Check that debug logging was called
        mock_logger.debug.assert_called()


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)