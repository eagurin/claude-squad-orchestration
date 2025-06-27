#!/usr/bin/env python3
"""
Greeting Service Module

A professional greeting service that demonstrates best practices for:
- Input validation
- Error handling
- Type hints
- Logging
- Documentation
- Internationalization support
"""

import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Language(Enum):
    """Supported languages for greetings."""
    
    ENGLISH = "en"
    RUSSIAN = "ru"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"


@dataclass
class GreetingConfig:
    """Configuration for greeting service."""
    
    language: Language = Language.ENGLISH
    include_timestamp: bool = False
    custom_greetings: Dict[str, str] = field(default_factory=dict)
    max_name_length: int = 100
    
    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        if self.max_name_length <= 0:
            raise ValueError("max_name_length must be positive")
        
        if self.max_name_length > 1000:
            raise ValueError("max_name_length cannot exceed 1000 characters")


class GreetingService:
    """
    Professional greeting service with internationalization support.
    
    This service provides greeting functionality with proper error handling,
    input validation, and support for multiple languages.
    
    Attributes:
        config: Configuration object for the service
        
    Example:
        >>> service = GreetingService()
        >>> result = service.greet("Alice")
        >>> print(result)
        Hello, Alice!
        
        >>> service = GreetingService(GreetingConfig(language=Language.RUSSIAN))
        >>> result = service.greet("Алиса")
        >>> print(result)
        Привет, Алиса!
    """
    
    # Default greetings for different languages
    DEFAULT_GREETINGS = {
        Language.ENGLISH: "Hello, {name}!",
        Language.RUSSIAN: "Привет, {name}!",
        Language.SPANISH: "¡Hola, {name}!",
        Language.FRENCH: "Bonjour, {name}!",
        Language.GERMAN: "Hallo, {name}!",
    }
    
    def __init__(self, config: Optional[GreetingConfig] = None) -> None:
        """
        Initialize the greeting service.
        
        Args:
            config: Optional configuration object. If None, uses default configuration.
            
        Raises:
            TypeError: If config is not a GreetingConfig instance
        """
        if config is None:
            config = GreetingConfig()
        
        if not isinstance(config, GreetingConfig):
            raise TypeError("config must be a GreetingConfig instance")
        
        self.config = config
        logger.info(f"GreetingService initialized with language: {config.language.value}")
    
    def greet(self, name: str = "World") -> str:
        """
        Generate a greeting message for the given name.
        
        Args:
            name: The name to greet. Defaults to "World".
            
        Returns:
            A formatted greeting string.
            
        Raises:
            ValueError: If name is empty or exceeds maximum length
            TypeError: If name is not a string
            
        Example:
            >>> service = GreetingService()
            >>> service.greet("Alice")
            'Hello, Alice!'
        """
        try:
            # Input validation
            if not isinstance(name, str):
                raise TypeError(f"name must be a string, got {type(name).__name__}")
            
            # Sanitize input
            name = name.strip()
            
            if not name:
                raise ValueError("name cannot be empty")
            
            if len(name) > self.config.max_name_length:
                raise ValueError(
                    f"name length ({len(name)}) exceeds maximum allowed "
                    f"({self.config.max_name_length})"
                )
            
            # Get greeting template
            template = self._get_greeting_template()
            
            # Format greeting
            greeting = template.format(name=name)
            
            # Add timestamp if configured
            if self.config.include_timestamp:
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                greeting += f" [Generated at {timestamp}]"
            
            logger.debug(f"Generated greeting for '{name}': {greeting}")
            return greeting
            
        except Exception as e:
            logger.error(f"Error generating greeting for '{name}': {e}")
            raise
    
    def _get_greeting_template(self) -> str:
        """
        Get the appropriate greeting template based on configuration.
        
        Returns:
            The greeting template string.
        """
        # Check for custom greeting first
        if self.config.language.value in self.config.custom_greetings:
            return self.config.custom_greetings[self.config.language.value]
        
        # Use default greeting
        return self.DEFAULT_GREETINGS.get(
            self.config.language,
            self.DEFAULT_GREETINGS[Language.ENGLISH]
        )
    
    def set_custom_greeting(self, language: Language, template: str) -> None:
        """
        Set a custom greeting template for a specific language.
        
        Args:
            language: The language for the custom greeting
            template: The greeting template (must contain {name} placeholder)
            
        Raises:
            ValueError: If template doesn't contain {name} placeholder
            TypeError: If language is not a Language enum value
            
        Example:
            >>> service = GreetingService()
            >>> service.set_custom_greeting(Language.ENGLISH, "Hi there, {name}!")
            >>> service.greet("Alice")
            'Hi there, Alice!'
        """
        if not isinstance(language, Language):
            raise TypeError("language must be a Language enum value")
        
        if not isinstance(template, str):
            raise TypeError("template must be a string")
        
        if "{name}" not in template:
            raise ValueError("template must contain {name} placeholder")
        
        self.config.custom_greetings[language.value] = template
        logger.info(f"Custom greeting set for {language.value}: {template}")
    
    def get_supported_languages(self) -> list[Language]:
        """
        Get list of supported languages.
        
        Returns:
            List of supported Language enum values.
        """
        return list(Language)
    
    def __repr__(self) -> str:
        """Return string representation of the service."""
        return (
            f"GreetingService(language={self.config.language.value}, "
            f"include_timestamp={self.config.include_timestamp})"
        )


def main() -> None:
    """
    Main function demonstrating the greeting service functionality.
    
    This function showcases various features of the GreetingService including:
    - Basic greeting functionality
    - Error handling
    - Different language support
    - Custom greeting templates
    """
    print("=== Claude Squad Greeting Service Demo ===\n")
    
    try:
        # Basic usage
        service = GreetingService()
        print("1. Basic greeting:")
        print(f"   {service.greet('Тестер')}")
        print(f"   {service.greet()}")  # Default name
        
        # Russian language
        print("\n2. Russian greetings:")
        ru_config = GreetingConfig(language=Language.RUSSIAN)
        ru_service = GreetingService(ru_config)
        print(f"   {ru_service.greet('Алиса')}")
        print(f"   {ru_service.greet('Мир')}")
        
        # With timestamp
        print("\n3. Greeting with timestamp:")
        ts_config = GreetingConfig(include_timestamp=True)
        ts_service = GreetingService(ts_config)
        print(f"   {ts_service.greet('Bob')}")
        
        # Custom greeting
        print("\n4. Custom greeting:")
        service.set_custom_greeting(Language.ENGLISH, "Welcome, {name}! 🎉")
        print(f"   {service.greet('Alice')}")
        
        # Supported languages
        print(f"\n5. Supported languages: {[lang.value for lang in service.get_supported_languages()]}")
        
        # Error handling demonstration
        print("\n6. Error handling:")
        try:
            service.greet("")  # Empty name
        except ValueError as e:
            print(f"   Caught expected error: {e}")
        
        try:
            service.greet("x" * 1001)  # Name too long
        except ValueError as e:
            print(f"   Caught expected error: {e}")
        
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main()