package models

import (
	"encoding/json"
	"fmt"

	"github.com/gophish/gophish/gateway"
)

// RescreenAllEvents re-evaluates the screening status of all events
// and updates the is_screened field in the database
func RescreenAllEvents() error {
	var events []Event
	
	// Get all events that have details (these are the ones that can be screened)
	err := db.Where("details IS NOT NULL AND details != ''").Find(&events).Error
	if err != nil {
		return fmt.Errorf("failed to fetch events: %v", err)
	}

	fmt.Printf("Found %d events with details to re-screen\n", len(events))
	
	updatedCount := 0
	errorCount := 0

	// Process events in batches to avoid memory issues
	batchSize := 100
	for i := 0; i < len(events); i += batchSize {
		end := i + batchSize
		if end > len(events) {
			end = len(events)
		}
		
		batch := events[i:end]
		err := rescreenEventBatch(batch)
		if err != nil {
			fmt.Printf("Error processing batch %d-%d: %v\n", i, end-1, err)
			errorCount++
		} else {
			updatedCount += len(batch)
		}
	}

	fmt.Printf("Re-screening complete: %d events updated, %d batches had errors\n", updatedCount, errorCount)
	return nil
}

// rescreenEventBatch processes a batch of events for re-screening
func rescreenEventBatch(events []Event) error {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, event := range events {
		newScreenStatus := evaluateEventScreening(event)
		
		// Only update if the status actually changed
		if newScreenStatus != event.IsScreened {
			err := tx.Model(&event).Update("is_screened", newScreenStatus).Error
			if err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to update event %d: %v", event.Id, err)
			}
		}
	}

	return tx.Commit().Error
}

// evaluateEventScreening determines if an event should be screened
// based on the details JSON and current screening rules
func evaluateEventScreening(event Event) bool {
	if event.Details == "" {
		return false
	}

	// Parse the event details JSON
	var details map[string]interface{}
	err := json.Unmarshal([]byte(event.Details), &details)
	if err != nil {
		fmt.Printf("[DEBUG] evaluateEventScreening: failed to parse details for event %d: %v\n", event.Id, err)
		return false
	}

	// Extract browser information
	browser, ok := details["browser"].(map[string]interface{})
	if !ok {
		return false
	}

	ipStr, _ := browser["address"].(string)
	uaStr, _ := browser["user-agent"].(string)

	// Use the same screening logic as the frontend
	return gateway.IsGatewayHit(ipStr, uaStr)
}

// GetEventScreeningStats returns statistics about event screening status
func GetEventScreeningStats() (map[string]int64, error) {
	stats := make(map[string]int64)
	var count int64

	// Total events
	err := db.Model(&Event{}).Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats["total_events"] = count

	// Events with details
	err = db.Model(&Event{}).Where("details IS NOT NULL AND details != ''").Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats["events_with_details"] = count

	// Screened events
	err = db.Model(&Event{}).Where("is_screened = ?", true).Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats["screened_events"] = count

	// Non-screened events
	err = db.Model(&Event{}).Where("is_screened = ?", false).Count(&count).Error
	if err != nil {
		return nil, err
	}
	stats["non_screened_events"] = count

	// Events by message type
	var eventTypes []struct {
		Message string
		Count   int64
	}
	err = db.Model(&Event{}).Select("message, count(*) as count").Group("message").Scan(&eventTypes).Error
	if err != nil {
		return nil, err
	}

	for _, et := range eventTypes {
		stats["type_"+et.Message] = et.Count
	}

	return stats, nil
}

// RescreenCampaignEvents re-screens all events for a specific campaign
func RescreenCampaignEvents(campaignID int64) error {
	var events []Event
	
	err := db.Where("campaign_id = ? AND details IS NOT NULL AND details != ''", campaignID).Find(&events).Error
	if err != nil {
		return fmt.Errorf("failed to fetch events for campaign %d: %v", campaignID, err)
	}

	fmt.Printf("Re-screening %d events for campaign %d\n", len(events), campaignID)
	
	return rescreenEventBatch(events)
}