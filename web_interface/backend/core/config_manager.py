"""
Modern Configuration Manager for Streamrip Web Interface
Handles configuration reading, updating, validation, and backup
"""

import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from streamrip.config import Config, DEFAULT_CONFIG_PATH, ConfigData
# from streamrip.exceptions import OutdatedConfigError  # Not available in current streamrip version

logger = logging.getLogger(__name__)


class ConfigManager:
    """Modern configuration manager with validation and backup"""
    
    def __init__(self):
        self.config_path = Path(DEFAULT_CONFIG_PATH)
        # Use app directory for backups in Docker environment
        self.backup_dir = Path("/app/config/backups")
        self.config: Optional[Config] = None
        self.config_data: Optional[ConfigData] = None
        
        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("⚙️ Configuration Manager initialized")
    
    async def initialize(self):
        """Initialize configuration manager"""
        try:
            await self.load_config()
            logger.info("✅ Configuration Manager initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Configuration Manager: {e}")
            raise
    
    async def load_config(self) -> Dict[str, Any]:
        """Load current configuration"""
        try:
            # Use the correct config path
            config_path = "/app/config/config.toml"
            self.config = Config(config_path)
            self.config_data = self.config.session
            
            # Convert to dictionary for API responses
            config_dict = self._config_to_dict()
            
            logger.info("📖 Configuration loaded successfully")
            return config_dict
            
        # except OutdatedConfigError as e:  # Not available in current streamrip version
        #     logger.error(f"❌ Outdated configuration: {e}")
        #     raise ValueError("Configuration file is outdated. Please update it.")
        except Exception as e:
            logger.error(f"❌ Failed to load configuration: {e}")
            raise
    
    async def get_config(self) -> Dict[str, Any]:
        """Get current configuration as dictionary"""
        if not self.config_data:
            return await self.load_config()
        
        return self._config_to_dict()
    
    async def get_config_section(self, section: str) -> Dict[str, Any]:
        """Get specific configuration section"""
        config_dict = await self.get_config()
        
        if section not in config_dict:
            raise ValueError(f"Configuration section '{section}' not found")
        
        return config_dict[section]
    
    async def update_config(self, updates: Dict[str, Any], create_backup: bool = True) -> Dict[str, Any]:
        """Update configuration with validation and backup"""
        try:
            if create_backup:
                await self._create_backup()
            
            # Validate updates
            await self._validate_config_updates(updates)
            
            # Apply updates
            await self._apply_config_updates(updates)
            
            # Save configuration
            self.config.save_file()
            
            # Reload to get updated values
            updated_config = await self.load_config()
            
            logger.info("💾 Configuration updated successfully")
            return updated_config
            
        except Exception as e:
            logger.error(f"❌ Failed to update configuration: {e}")
            raise
    
    async def update_config_section(self, section: str, updates: Dict[str, Any], create_backup: bool = True) -> Dict[str, Any]:
        """Update specific configuration section"""
        try:
            if create_backup:
                await self._create_backup()
            
            # Get current section
            current_section = await self.get_config_section(section)
            
            # Merge updates
            updated_section = {**current_section, **updates}
            
            # Validate section updates
            await self._validate_section_updates(section, updated_section)
            
            # Apply section updates
            await self._apply_section_updates(section, updated_section)
            
            # Save configuration
            self.config.save_file()
            
            # Return updated section
            return await self.get_config_section(section)
            
        except Exception as e:
            logger.error(f"❌ Failed to update configuration section '{section}': {e}")
            raise
    
    async def reset_config_section(self, section: str) -> Dict[str, Any]:
        """Reset configuration section to defaults"""
        try:
            await self._create_backup()
            
            # Get default configuration
            default_config = ConfigData.defaults()
            default_section = getattr(default_config, section)
            
            # Apply default values
            await self._apply_section_updates(section, asdict(default_section))
            
            # Save configuration
            self.config.save_file()
            
            logger.info(f"🔄 Configuration section '{section}' reset to defaults")
            return await self.get_config_section(section)
            
        except Exception as e:
            logger.error(f"❌ Failed to reset configuration section '{section}': {e}")
            raise
    
    async def validate_config(self) -> Dict[str, Any]:
        """Validate current configuration"""
        try:
            validation_results = {
                "valid": True,
                "errors": [],
                "warnings": [],
                "sections": {}
            }
            
            config_dict = await self.get_config()
            
            # Validate each section
            for section_name, section_data in config_dict.items():
                section_validation = await self._validate_section(section_name, section_data)
                validation_results["sections"][section_name] = section_validation
                
                if section_validation["errors"]:
                    validation_results["valid"] = False
                    validation_results["errors"].extend(section_validation["errors"])
                
                validation_results["warnings"].extend(section_validation["warnings"])
            
            return validation_results
            
        except Exception as e:
            logger.error(f"❌ Configuration validation failed: {e}")
            raise
    
    async def get_backups(self) -> List[Dict[str, Any]]:
        """Get list of configuration backups"""
        try:
            backups = []
            
            for backup_file in self.backup_dir.glob("config_backup_*.toml"):
                stat = backup_file.stat()
                backups.append({
                    "filename": backup_file.name,
                    "path": str(backup_file),
                    "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "size": stat.st_size
                })
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x["created_at"], reverse=True)
            
            return backups
            
        except Exception as e:
            logger.error(f"❌ Failed to get backups: {e}")
            raise
    
    async def restore_backup(self, backup_filename: str) -> Dict[str, Any]:
        """Restore configuration from backup"""
        try:
            backup_path = self.backup_dir / backup_filename
            
            if not backup_path.exists():
                raise ValueError(f"Backup file '{backup_filename}' not found")
            
            # Create backup of current config before restore
            await self._create_backup("pre_restore")
            
            # Copy backup to main config
            shutil.copy2(backup_path, self.config_path)
            
            # Reload configuration
            restored_config = await self.load_config()
            
            logger.info(f"🔄 Configuration restored from backup: {backup_filename}")
            return restored_config
            
        except Exception as e:
            logger.error(f"❌ Failed to restore backup '{backup_filename}': {e}")
            raise
    
    def _config_to_dict(self) -> Dict[str, Any]:
        """Convert ConfigData to dictionary"""
        if not self.config_data:
            raise ValueError("Configuration not loaded")

        try:
            # Use the config's built-in dict conversion if available
            if hasattr(self.config_data, 'dict'):
                return self.config_data.dict()

            # Fallback to manual conversion with error handling
            config_dict = {}

            # List of expected config sections
            sections = ["downloads", "qobuz", "tidal", "deezer", "soundcloud",
                       "youtube", "lastfm", "filepaths", "artwork", "metadata",
                       "qobuz_filters", "cli", "database", "conversion", "misc"]

            for section in sections:
                try:
                    if hasattr(self.config_data, section):
                        attr_value = getattr(self.config_data, section)
                        if hasattr(attr_value, '__dataclass_fields__'):
                            config_dict[section] = asdict(attr_value)
                        else:
                            config_dict[section] = attr_value
                except Exception as e:
                    logger.warning(f"Failed to convert config section {section}: {e}")
                    # Use a default value for this section
                    config_dict[section] = {}

            return config_dict

        except Exception as e:
            logger.error(f"Failed to convert config to dict: {e}")
            # Return a minimal config structure
            return {
                "downloads": {"folder": "/app/downloads"},
                "qobuz": {"email": "", "password": "", "quality": 3},
                "tidal": {"username": "", "password": "", "quality": "HI_RES"},
                "deezer": {"arl": "", "quality": 2},
                "soundcloud": {"client_id": "", "app_version": ""},
                "youtube": {"video_downloads_folder": "/app/downloads"},
                "lastfm": {"username": "", "password": ""},
                "filepaths": {"folder": "/app/downloads"},
                "artwork": {"embed": True, "size": 1400},
                "metadata": {"set_playlist_to_album": False, "renumber_playlist_tracks": False},
            }
    
    async def _create_backup(self, suffix: str = "") -> str:
        """Create configuration backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"config_backup_{timestamp}"
        
        if suffix:
            backup_name += f"_{suffix}"
        
        backup_name += ".toml"
        backup_path = self.backup_dir / backup_name
        
        shutil.copy2(self.config_path, backup_path)
        
        logger.info(f"💾 Configuration backup created: {backup_name}")
        return backup_name
    
    async def _validate_config_updates(self, updates: Dict[str, Any]):
        """Validate configuration updates"""
        # Basic validation - can be extended
        for section, section_data in updates.items():
            if not isinstance(section_data, dict):
                raise ValueError(f"Section '{section}' must be a dictionary")
    
    async def _validate_section_updates(self, section: str, updates: Dict[str, Any]):
        """Validate section-specific updates"""
        # Section-specific validation logic
        if section == "downloads":
            if "max_connections" in updates and updates["max_connections"] < -1:
                raise ValueError("max_connections must be -1 or positive")
        
        elif section == "qobuz":
            if "quality" in updates and updates["quality"] not in [1, 2, 3, 4]:
                raise ValueError("Qobuz quality must be 1, 2, 3, or 4")
    
    async def _validate_section(self, section_name: str, section_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate individual configuration section"""
        validation = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Add section-specific validation logic here
        # This is a simplified example
        
        return validation
    
    async def _apply_config_updates(self, updates: Dict[str, Any]):
        """Apply configuration updates"""
        for section, section_data in updates.items():
            await self._apply_section_updates(section, section_data)
    
    async def _apply_section_updates(self, section: str, updates: Dict[str, Any]):
        """Apply updates to specific configuration section"""
        if not hasattr(self.config_data, section):
            raise ValueError(f"Unknown configuration section: {section}")
        
        section_obj = getattr(self.config_data, section)
        
        # Update section attributes
        for key, value in updates.items():
            if hasattr(section_obj, key):
                setattr(section_obj, key, value)
            else:
                logger.warning(f"Unknown configuration key: {section}.{key}")
        
        # Mark configuration as modified
        self.config_data.set_modified()
    
    def is_healthy(self) -> bool:
        """Health check for configuration manager"""
        return self.config is not None and self.config_data is not None
