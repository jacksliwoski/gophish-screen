package models

import (
	"encoding/json"
	"fmt"
	"time"
	
	"github.com/gophish/gophish/gateway"
)

// ScreeningConfig holds the configuration for gateway detection
type ScreeningConfig struct {
	Id              int64     `json:"id"`
	UserId          int64     `json:"-"`
	Name            string    `json:"name" sql:"not null"`
	Description     string    `json:"description"`
	GatewayCIDRs    []string  `json:"gateway_cidrs"`
	GatewayUASignatures []string `json:"gateway_ua_signatures"`
	Enabled         bool      `json:"enabled"`
	CreatedDate     time.Time `json:"created_date"`
	ModifiedDate    time.Time `json:"modified_date"`
}

// ScreeningConfigSummary provides a summary of screening configurations
type ScreeningConfigSummary struct {
	Id           int64  `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Enabled      bool   `json:"enabled"`
	CIDRCount    int    `json:"cidr_count"`
	UACount      int    `json:"ua_count"`
	ModifiedDate time.Time `json:"modified_date"`
}

// GetScreeningConfigs returns all screening configurations for a user
func GetScreeningConfigs(uid int64) ([]ScreeningConfig, error) {
	configs := []ScreeningConfig{}
	err := db.Where("user_id=?", uid).Find(&configs).Error
	return configs, err
}

// GetScreeningConfig returns a specific screening configuration
func GetScreeningConfig(id, uid int64) (ScreeningConfig, error) {
	config := ScreeningConfig{}
	err := db.Where("id=? AND user_id=?", id, uid).First(&config).Error
	return config, err
}

// GetActiveScreeningConfig returns the currently active screening configuration for a user
func GetActiveScreeningConfig(uid int64) (ScreeningConfig, error) {
	config := ScreeningConfig{}
	err := db.Where("user_id=? AND enabled=?", uid, true).First(&config).Error
	return config, err
}

// PostScreeningConfig creates a new screening configuration
func PostScreeningConfig(config *ScreeningConfig, uid int64) error {
	// Validate the configuration
	if config.Name == "" {
		return fmt.Errorf("screening configuration name is required")
	}

	// If this config is being enabled, disable all other configs for this user
	if config.Enabled {
		err := db.Model(&ScreeningConfig{}).Where("user_id=?", uid).Update("enabled", false).Error
		if err != nil {
			return err
		}
	}

	config.UserId = uid
	config.CreatedDate = time.Now().UTC()
	config.ModifiedDate = config.CreatedDate

	return db.Save(config).Error
}

// PutScreeningConfig updates an existing screening configuration
func PutScreeningConfig(config *ScreeningConfig, uid int64) error {
	// Verify the config belongs to the user
	existing, err := GetScreeningConfig(config.Id, uid)
	if err != nil {
		return err
	}

	// If this config is being enabled, disable all other configs for this user
	if config.Enabled && !existing.Enabled {
		err := db.Model(&ScreeningConfig{}).Where("user_id=? AND id!=?", uid, config.Id).Update("enabled", false).Error
		if err != nil {
			return err
		}
	}

	config.UserId = uid
	config.CreatedDate = existing.CreatedDate
	config.ModifiedDate = time.Now().UTC()

	return db.Save(config).Error
}

// DeleteScreeningConfig deletes a screening configuration
func DeleteScreeningConfig(id, uid int64) error {
	// Verify the config belongs to the user
	_, err := GetScreeningConfig(id, uid)
	if err != nil {
		return err
	}

	return db.Where("id=? AND user_id=?", id, uid).Delete(&ScreeningConfig{}).Error
}

// GetScreeningConfigSummaries returns a summary of all screening configurations
func GetScreeningConfigSummaries(uid int64) ([]ScreeningConfigSummary, error) {
	configs, err := GetScreeningConfigs(uid)
	if err != nil {
		return nil, err
	}

	summaries := make([]ScreeningConfigSummary, len(configs))
	for i, config := range configs {
		summaries[i] = ScreeningConfigSummary{
			Id:           config.Id,
			Name:         config.Name,
			Description:  config.Description,
			Enabled:      config.Enabled,
			CIDRCount:    len(config.GatewayCIDRs),
			UACount:      len(config.GatewayUASignatures),
			ModifiedDate: config.ModifiedDate,
		}
	}

	return summaries, nil
}

// GetDefaultScreeningConfig returns a default screening configuration
func GetDefaultScreeningConfig() ScreeningConfig {
	return ScreeningConfig{
		Name:        "Default Gateway Detection",
		Description: "Default configuration based on common email gateways and scanning services",
		GatewayCIDRs: []string{
			"34.0.0.0/8",     // AWS public IP block
			"35.0.0.0/8",
			"37.0.0.0/8",
			"38.0.0.0/8",
			"54.0.0.0/8",
			"44.0.0.0/8",
			"52.0.0.0/8",
			"3.0.0.0/8",
			"18.0.0.0/8",
			"108.0.0.0/8",
			"212.0.0.0/8",
		},
		GatewayUASignatures: []string{
			"ms-office-web",                // Outlook/Exchange crawler
			"proofpoint",                   // Proofpoint scanner
			"mimecast",                     // Mimecast scanner
			"microsoft-exchange-transport", // Exchange crawler
			"linux x86_64) applewebkit",   // generic Linux/Chrome bots
		},
		Enabled: true,
	}
}

// ApplyScreeningConfig applies a screening configuration to the gateway detector
func ApplyScreeningConfig(config ScreeningConfig) error {
	configJSON, err := json.Marshal(config)
	if err != nil {
		return err
	}

	// Update the gateway detector configuration
	err = gateway.UpdateGatewayConfig(config.GatewayCIDRs, config.GatewayUASignatures)
	if err != nil {
		return err
	}
	
	fmt.Printf("[INFO] Applied screening config: %s\n", configJSON)
	
	return nil
}

// EnsureDefaultScreeningConfig ensures a user has at least one screening configuration
func EnsureDefaultScreeningConfig(uid int64) error {
	// Check if user has any screening configs
	configs, err := GetScreeningConfigs(uid)
	if err != nil {
		return err
	}

	// If no configs exist, create a default one
	if len(configs) == 0 {
		defaultConfig := GetDefaultScreeningConfig()
		defaultConfig.UserId = uid
		return PostScreeningConfig(&defaultConfig, uid)
	}

	// If no config is enabled, enable the first one
	hasEnabled := false
	for _, config := range configs {
		if config.Enabled {
			hasEnabled = true
			break
		}
	}

	if !hasEnabled && len(configs) > 0 {
		configs[0].Enabled = true
		return PutScreeningConfig(&configs[0], uid)
	}

	return nil
}