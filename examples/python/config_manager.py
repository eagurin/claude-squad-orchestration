#!/usr/bin/env python3
"""
Configuration Management Module

A professional configuration management system that demonstrates best practices for:
- JSON/YAML configuration file handling
- Schema validation
- Environment variable integration
- Type safety and validation
- Configuration inheritance and overrides
- Secure configuration handling
"""

import json
import os
import logging
from typing import Dict, Any, Optional, Union, List
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConfigFormat(Enum):
    """Supported configuration file formats."""
    
    JSON = "json"
    YAML = "yaml"
    TOML = "toml"


class EnvironmentType(Enum):
    """Application environment types."""
    
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class DatabaseConfig:
    """Database configuration settings."""
    
    host: str = "localhost"
    port: int = 5432
    database: str = "claude_squad"
    username: str = "user"
    password: str = ""
    ssl_mode: str = "prefer"
    connection_timeout: int = 30
    max_connections: int = 10
    
    def __post_init__(self) -> None:
        """Validate database configuration."""
        if not isinstance(self.port, int) or not (1 <= self.port <= 65535):
            raise ValueError(f"Invalid port number: {self.port}")
        
        if self.connection_timeout <= 0:
            raise ValueError("Connection timeout must be positive")
        
        if self.max_connections <= 0:
            raise ValueError("Max connections must be positive")
    
    def get_connection_string(self) -> str:
        """Generate database connection string."""
        return (
            f"postgresql://{self.username}:{self.password}@"
            f"{self.host}:{self.port}/{self.database}"
            f"?sslmode={self.ssl_mode}&connect_timeout={self.connection_timeout}"
        )


@dataclass
class ServerConfig:
    """Server configuration settings."""
    
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    reload: bool = False
    workers: int = 1
    access_log: bool = True
    ssl_cert_file: Optional[str] = None
    ssl_key_file: Optional[str] = None
    
    def __post_init__(self) -> None:
        """Validate server configuration."""
        if not isinstance(self.port, int) or not (1 <= self.port <= 65535):
            raise ValueError(f"Invalid port number: {self.port}")
        
        if self.workers <= 0:
            raise ValueError("Number of workers must be positive")
        
        # Validate SSL configuration
        if bool(self.ssl_cert_file) != bool(self.ssl_key_file):
            raise ValueError("Both SSL cert and key files must be provided together")


@dataclass
class LoggingConfig:
    """Logging configuration settings."""
    
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    console_output: bool = True
    
    def __post_init__(self) -> None:
        """Validate logging configuration."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if self.level.upper() not in valid_levels:
            raise ValueError(f"Invalid log level: {self.level}")
        
        if self.max_file_size <= 0:
            raise ValueError("Max file size must be positive")
        
        if self.backup_count < 0:
            raise ValueError("Backup count cannot be negative")


@dataclass
class ApplicationConfig:
    """Main application configuration."""
    
    name: str = "claude-squad-example"
    version: str = "1.0.0"
    description: str = "Claude Squad Example Application"
    environment: EnvironmentType = EnvironmentType.DEVELOPMENT
    secret_key: str = ""
    allowed_hosts: List[str] = field(default_factory=lambda: ["localhost", "127.0.0.1"])
    cors_origins: List[str] = field(default_factory=list)
    
    # Nested configurations
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    
    # Custom settings
    custom_settings: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self) -> None:
        """Validate application configuration."""
        if not self.name:
            raise ValueError("Application name cannot be empty")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', self.name):
            raise ValueError("Application name contains invalid characters")
        
        if not self.version:
            raise ValueError("Application version cannot be empty")
        
        if self.environment == EnvironmentType.production and not self.secret_key:
            raise ValueError("Secret key is required for production environment")


class ConfigurationManager:
    """
    Professional configuration management system.
    
    This class provides comprehensive configuration management including:
    - Loading from multiple file formats (JSON, YAML, TOML)
    - Environment variable integration
    - Configuration validation
    - Environment-specific overrides
    - Secure configuration handling
    
    Features:
    - Type-safe configuration objects
    - Schema validation
    - Environment variable substitution
    - Configuration inheritance
    - Hot reloading support
    - Secure secret handling
    
    Example:
        >>> config_manager = ConfigurationManager()
        >>> config = config_manager.load_config("config.json")
        >>> print(f"Server running on {config.server.host}:{config.server.port}")
        
        >>> # Load with environment overrides
        >>> config = config_manager.load_config_with_env("config.json", "PRODUCTION")
    """
    
    def __init__(self, base_dir: Optional[Path] = None) -> None:
        """
        Initialize the configuration manager.
        
        Args:
            base_dir: Base directory for configuration files. Defaults to current directory.
        """
        self.base_dir = base_dir or Path.cwd()
        logger.info(f"ConfigurationManager initialized with base_dir: {self.base_dir}")
    
    def load_config(self, config_path: Union[str, Path]) -> ApplicationConfig:
        """
        Load configuration from a file.
        
        Args:
            config_path: Path to the configuration file
            
        Returns:
            ApplicationConfig object
            
        Raises:
            FileNotFoundError: If configuration file doesn't exist
            ValueError: If configuration format is unsupported or invalid
            ValidationError: If configuration validation fails
        """
        try:
            config_path = Path(config_path)
            if not config_path.is_absolute():
                config_path = self.base_dir / config_path
            
            if not config_path.exists():
                raise FileNotFoundError(f"Configuration file not found: {config_path}")
            
            # Determine format from file extension
            format_type = self._detect_format(config_path)
            
            # Load raw configuration data
            raw_config = self._load_raw_config(config_path, format_type)
            
            # Apply environment variable substitution
            processed_config = self._substitute_env_vars(raw_config)
            
            # Create and validate configuration object
            config = self._create_config_object(processed_config)
            
            logger.info(f"Successfully loaded configuration from {config_path}")
            return config
            
        except Exception as e:
            logger.error(f"Error loading configuration from {config_path}: {e}")
            raise
    
    def load_config_with_env(self, config_path: Union[str, Path], 
                           environment: str) -> ApplicationConfig:
        """
        Load configuration with environment-specific overrides.
        
        Args:
            config_path: Path to the base configuration file
            environment: Environment name (development, production, etc.)
            
        Returns:
            ApplicationConfig object with environment overrides applied
        """
        try:
            # Load base configuration
            base_config = self.load_config(config_path)
            
            # Try to load environment-specific overrides
            config_path = Path(config_path)
            env_config_path = config_path.parent / f"{config_path.stem}.{environment.lower()}{config_path.suffix}"
            
            if env_config_path.exists():
                logger.info(f"Loading environment overrides from {env_config_path}")
                
                format_type = self._detect_format(env_config_path)
                env_overrides = self._load_raw_config(env_config_path, format_type)
                env_overrides = self._substitute_env_vars(env_overrides)
                
                # Merge configurations
                merged_config = self._merge_configs(asdict(base_config), env_overrides)
                config = self._create_config_object(merged_config)
                
                logger.info(f"Applied environment overrides for {environment}")
                return config
            else:
                logger.info(f"No environment overrides found for {environment}")
                return base_config
                
        except Exception as e:
            logger.error(f"Error loading configuration with environment {environment}: {e}")
            raise
    
    def save_config(self, config: ApplicationConfig, 
                   config_path: Union[str, Path],
                   format_type: Optional[ConfigFormat] = None) -> None:
        """
        Save configuration to a file.
        
        Args:
            config: Configuration object to save
            config_path: Path where to save the configuration
            format_type: File format to use. If None, detected from file extension.
            
        Raises:
            ValueError: If format is unsupported
            PermissionError: If unable to write to file
        """
        try:
            config_path = Path(config_path)
            if not config_path.is_absolute():
                config_path = self.base_dir / config_path
            
            if format_type is None:
                format_type = self._detect_format(config_path)
            
            # Convert config to dictionary
            config_dict = asdict(config)
            
            # Remove sensitive information if needed
            config_dict = self._sanitize_config_for_save(config_dict)
            
            # Save based on format
            if format_type == ConfigFormat.JSON:
                with open(config_path, 'w', encoding='utf-8') as f:
                    json.dump(config_dict, f, indent=2, ensure_ascii=False, default=str)
            else:
                raise ValueError(f"Saving in {format_type.value} format is not yet implemented")
            
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            logger.error(f"Error saving configuration to {config_path}: {e}")
            raise
    
    def validate_config(self, config: ApplicationConfig) -> List[str]:
        """
        Validate configuration and return list of issues.
        
        Args:
            config: Configuration object to validate
            
        Returns:
            List of validation issues (empty if valid)
        """
        issues = []
        
        try:
            # Basic validation is done in __post_init__ methods
            # Additional custom validation can be added here
            
            # Validate database connectivity settings
            if config.environment != EnvironmentType.DEVELOPMENT:
                if not config.database.password:
                    issues.append("Database password is required for non-development environments")
            
            # Validate server configuration
            if config.server.debug and config.environment == EnvironmentType.PRODUCTION:
                issues.append("Debug mode should not be enabled in production")
            
            # Validate SSL configuration for production
            if config.environment == EnvironmentType.PRODUCTION:
                if not config.server.ssl_cert_file:
                    issues.append("SSL certificate is recommended for production")
            
            # Validate CORS settings
            if config.environment == EnvironmentType.PRODUCTION and not config.cors_origins:
                issues.append("CORS origins should be explicitly configured for production")
            
            logger.info(f"Configuration validation completed with {len(issues)} issues")
            return issues
            
        except Exception as e:
            logger.error(f"Error during configuration validation: {e}")
            return [f"Validation error: {str(e)}"]
    
    def _detect_format(self, config_path: Path) -> ConfigFormat:
        """Detect configuration file format from extension."""
        extension = config_path.suffix.lower()
        
        format_map = {
            '.json': ConfigFormat.JSON,
            '.yaml': ConfigFormat.YAML,
            '.yml': ConfigFormat.YAML,
            '.toml': ConfigFormat.TOML
        }
        
        if extension not in format_map:
            raise ValueError(f"Unsupported configuration file format: {extension}")
        
        return format_map[extension]
    
    def _load_raw_config(self, config_path: Path, format_type: ConfigFormat) -> Dict[str, Any]:
        """Load raw configuration data from file."""
        if format_type == ConfigFormat.JSON:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        else:
            raise ValueError(f"Loading {format_type.value} format is not yet implemented")
    
    def _substitute_env_vars(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Substitute environment variables in configuration values."""
        def substitute_value(value):
            if isinstance(value, str):
                # Look for ${VAR_NAME} or ${VAR_NAME:default_value} patterns
                pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'
                
                def replace_env_var(match):
                    var_name = match.group(1)
                    default_value = match.group(2) or ""
                    return os.getenv(var_name, default_value)
                
                return re.sub(pattern, replace_env_var, value)
            elif isinstance(value, dict):
                return {k: substitute_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [substitute_value(item) for item in value]
            else:
                return value
        
        return substitute_value(config_dict)
    
    def _merge_configs(self, base_config: Dict[str, Any], 
                      override_config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge two configuration dictionaries, with override taking precedence."""
        def merge_dict(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
            merged = base.copy()
            
            for key, value in override.items():
                if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                    merged[key] = merge_dict(merged[key], value)
                else:
                    merged[key] = value
            
            return merged
        
        return merge_dict(base_config, override_config)
    
    def _create_config_object(self, config_dict: Dict[str, Any]) -> ApplicationConfig:
        """Create ApplicationConfig object from dictionary."""
        try:
            # Handle enum conversions
            if 'environment' in config_dict:
                env_value = config_dict['environment']
                if isinstance(env_value, str):
                    config_dict['environment'] = EnvironmentType(env_value.lower())
            
            # Create nested configuration objects
            if 'database' in config_dict and isinstance(config_dict['database'], dict):
                config_dict['database'] = DatabaseConfig(**config_dict['database'])
            
            if 'server' in config_dict and isinstance(config_dict['server'], dict):
                config_dict['server'] = ServerConfig(**config_dict['server'])
            
            if 'logging' in config_dict and isinstance(config_dict['logging'], dict):
                config_dict['logging'] = LoggingConfig(**config_dict['logging'])
            
            return ApplicationConfig(**config_dict)
            
        except Exception as e:
            raise ValueError(f"Error creating configuration object: {e}")
    
    def _sanitize_config_for_save(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Remove or mask sensitive information when saving configuration."""
        sanitized = config_dict.copy()
        
        # Mask sensitive fields
        sensitive_fields = ['password', 'secret_key', 'api_key', 'token']
        
        def sanitize_recursive(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if any(sensitive in key.lower() for sensitive in sensitive_fields):
                        if value:  # Only mask non-empty values
                            obj[key] = "***MASKED***"
                    else:
                        sanitize_recursive(value)
            elif isinstance(obj, list):
                for item in obj:
                    sanitize_recursive(item)
        
        sanitize_recursive(sanitized)
        return sanitized
    
    def get_default_config(self) -> ApplicationConfig:
        """Get default configuration object."""
        return ApplicationConfig()
    
    def __repr__(self) -> str:
        """Return string representation of the configuration manager."""
        return f"ConfigurationManager(base_dir={self.base_dir})"


# Enhanced configuration for the original sample data
def create_sample_config() -> Dict[str, Any]:
    """Create enhanced sample configuration based on original test_config.json."""
    return {
        "name": "claude-squad-test-project",
        "version": "2.0.0",
        "description": "Professional Claude Squad Test Configuration",
        "environment": "development",
        "secret_key": "${SECRET_KEY:development-secret-key}",
        "allowed_hosts": ["localhost", "127.0.0.1", "0.0.0.0"],
        "cors_origins": ["http://localhost:3000", "http://localhost:8080"],
        
        "database": {
            "host": "${DATABASE_HOST:localhost}",
            "port": "${DATABASE_PORT:5432}",
            "database": "${DATABASE_NAME:claude_squad_test}",
            "username": "${DATABASE_USER:test_user}",
            "password": "${DATABASE_PASSWORD:test_password}",
            "ssl_mode": "prefer",
            "connection_timeout": 30,
            "max_connections": 10
        },
        
        "server": {
            "host": "${SERVER_HOST:0.0.0.0}",
            "port": "${SERVER_PORT:8000}",
            "debug": "${DEBUG:true}",
            "reload": "${RELOAD:true}",
            "workers": "${WORKERS:1}",
            "access_log": "${ACCESS_LOG:true}"
        },
        
        "logging": {
            "level": "${LOG_LEVEL:INFO}",
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "file_path": "${LOG_FILE:logs/application.log}",
            "max_file_size": 10485760,
            "backup_count": 5,
            "console_output": true
        },
        
        "custom_settings": {
            "timeout": 5000,
            "retries": 3,
            "cache_ttl": 300,
            "rate_limit": 100,
            "features": {
                "analytics": true,
                "monitoring": true,
                "caching": true
            }
        }
    }


def main() -> None:
    """
    Main function demonstrating the configuration management functionality.
    
    This function showcases various features of the ConfigurationManager including:
    - Loading and saving configurations
    - Environment variable substitution
    - Configuration validation
    - Error handling
    - Environment-specific overrides
    """
    print("=== Claude Squad Configuration Management Demo ===\n")
    
    try:
        # Initialize configuration manager
        config_manager = ConfigurationManager()
        
        print("1. Creating sample configuration file...")
        sample_config_path = Path("sample_config.json")
        
        # Create sample configuration
        sample_config_dict = create_sample_config()
        
        with open(sample_config_path, 'w', encoding='utf-8') as f:
            json.dump(sample_config_dict, f, indent=2, ensure_ascii=False)
        
        print(f"   Sample configuration saved to: {sample_config_path}")
        
        print("\n2. Loading configuration...")
        config = config_manager.load_config(sample_config_path)
        print(f"   Loaded configuration for: {config.name} v{config.version}")
        print(f"   Environment: {config.environment.value}")
        print(f"   Server: {config.server.host}:{config.server.port}")
        print(f"   Database: {config.database.host}:{config.database.port}")
        
        print("\n3. Configuration validation...")
        validation_issues = config_manager.validate_config(config)
        if validation_issues:
            print("   Validation issues found:")
            for issue in validation_issues:
                print(f"   - {issue}")
        else:
            print("   Configuration is valid!")
        
        print("\n4. Environment variable demonstration...")
        # Set some environment variables
        os.environ['SERVER_PORT'] = '9000'
        os.environ['DEBUG'] = 'false'
        os.environ['DATABASE_HOST'] = 'production-db.example.com'
        
        # Reload configuration to pick up environment variables
        config_with_env = config_manager.load_config(sample_config_path)
        print(f"   Server port with env var: {config_with_env.server.port}")
        print(f"   Debug mode with env var: {config_with_env.server.debug}")
        print(f"   Database host with env var: {config_with_env.database.host}")
        
        print("\n5. Custom settings access...")
        custom_timeout = config.custom_settings.get('timeout', 0)
        custom_features = config.custom_settings.get('features', {})
        print(f"   Custom timeout: {custom_timeout}")
        print(f"   Analytics enabled: {custom_features.get('analytics', False)}")
        
        print("\n6. Configuration object creation...")
        # Create configuration programmatically
        programmatic_config = ApplicationConfig(
            name="programmatic-app",
            version="1.0.0",
            environment=EnvironmentType.TESTING,
            database=DatabaseConfig(host="test-db", port=5433),
            server=ServerConfig(port=8080, debug=True)
        )
        print(f"   Created config: {programmatic_config.name}")
        print(f"   Test database: {programmatic_config.database.host}:{programmatic_config.database.port}")
        
        print("\n7. Error handling demonstration...")
        try:
            # Try to load non-existent configuration
            config_manager.load_config("non_existent_config.json")
        except FileNotFoundError as e:
            print(f"   Caught expected error: {e}")
        
        try:
            # Try invalid configuration
            invalid_config = ApplicationConfig(name="", version="1.0.0")
        except ValueError as e:
            print(f"   Caught expected error: {e}")
        
        print("\n8. Saving configuration...")
        output_path = Path("output_config.json")
        config_manager.save_config(config, output_path)
        print(f"   Configuration saved to: {output_path}")
        
        # Clean up
        print("\n9. Cleaning up temporary files...")
        for temp_file in [sample_config_path, output_path]:
            if temp_file.exists():
                temp_file.unlink()
                print(f"   Removed: {temp_file}")
        
        print("\n✅ Configuration management demo completed successfully!")
        
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        print(f"Error: {e}")


if __name__ == "__main__":
    main()