package models

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
	"net"
	"time"

	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/webhook"
	"github.com/jinzhu/gorm"
	"github.com/oschwald/maxminddb-golang"

	// Import the gateway detector to set IsScreened
	"github.com/gophish/gophish/controllers"
)

// mmCity and mmGeoPoint are used for MaxMind GeoIP lookups
type mmCity struct {
	GeoPoint mmGeoPoint `maxminddb:"location"`
}

type mmGeoPoint struct {
	Latitude  float64 `maxminddb:"latitude"`
	Longitude float64 `maxminddb:"longitude"`
}

// Result contains the fields for a result object, which is a representation of a target in a campaign.
type Result struct {
	Id           int64     `json:"-"`
	CampaignId   int64     `json:"-"`
	UserId       int64     `json:"-"`
	RId          string    `json:"id"`
	Status       string    `json:"status" sql:"not null"`
	IP           string    `json:"ip"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	SendDate     time.Time `json:"send_date"`
	Reported     bool      `json:"reported" sql:"not null"`
	ModifiedDate time.Time `json:"modified_date"`
	BaseRecipient
}

// Event contains the fields for an event that occurs during the campaign.
type Event struct {
	Id         int64     `json:"-"`
	CampaignId int64     `json:"campaign_id"`
	Email      string    `json:"email"`
	Time       time.Time `json:"time"`
	Message    string    `json:"message"`
	Details    string    `json:"details"`
	IsScreened bool      `json:"is_screened" gorm:"column:is_screened"`
}

// EventDetails wraps common attributes we want to store in an event.
type EventDetails struct {
	Payload url.Values        `json:"payload"`
	Browser map[string]string `json:"browser"`
}

// EventError wraps an error that occurs when sending an email to a recipient.
type EventError struct {
	Error string `json:"error"`
}

// Err... are various error constants used throughout campaign handling.
var (
	ErrCampaignNameNotSpecified = errors.New("Campaign name not specified")
	ErrGroupNotSpecified        = errors.New("No groups specified")
	ErrTemplateNotSpecified     = errors.New("No email template specified")
	ErrPageNotSpecified         = errors.New("No landing page specified")
	ErrSMTPNotSpecified         = errors.New("No sending profile specified")
	ErrTemplateNotFound         = errors.New("Template not found")
	ErrGroupNotFound            = errors.New("Group not found")
	ErrPageNotFound             = errors.New("Page not found")
	ErrSMTPNotFound             = errors.New("Sending profile not found")
	ErrInvalidSendByDate        = errors.New("The launch date must be before the \"send emails by\" date")
)

// RecipientParameter is the URL parameter that points to the result ID for a recipient.
const RecipientParameter = "rid"

// createEvent builds an Event from a Result status change, sets IsScreened if needed, and saves it.
func (r *Result) createEvent(status string, details interface{}) (*Event, error) {
	e := &Event{
		Email:   r.Email,
		Message: status,
		Time:    time.Now().UTC(),
	}
	// If details were provided, marshal them to JSON and attach to Event.Details
	if details != nil {
		dj, err := json.Marshal(details)
		if err != nil {
			return nil, err
		}
		e.Details = string(dj)

		// Attempt to detect a gateway-probe hit by inspecting EventDetails
		if det, ok := details.(EventDetails); ok {
			ip := det.Browser["address"]
			ua := det.Browser["user-agent"]
			if controllers.IsGatewayHit(ip, ua) {
				e.IsScreened = true
			}
		}
	}

	// Persist the Event
	AddEvent(e, r.CampaignId)
	return e, nil
}

// HandleEmailSent updates a Result to indicate that the email has been successfully sent to the SMTP server.
func (r *Result) HandleEmailSent() error {
	event, err := r.createEvent(EventSent, nil)
	if err != nil {
		return err
	}
	r.SendDate = event.Time
	r.Status = EventSent
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleEmailError updates a Result for an error when sending the email.
func (r *Result) HandleEmailError(err error) error {
	event, err := r.createEvent(EventSendingError, EventError{Error: err.Error()})
	if err != nil {
		return err
	}
	r.Status = Error
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleEmailBackoff updates a Result for a temporary error requiring a retry.
func (r *Result) HandleEmailBackoff(err error, sendDate time.Time) error {
	event, err := r.createEvent(EventSendingError, EventError{Error: err.Error()})
	if err != nil {
		return err
	}
	r.Status = StatusRetry
	r.SendDate = sendDate
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleEmailOpened updates a Result when the recipient opens the email.
func (r *Result) HandleEmailOpened(details EventDetails) error {
	event, err := r.createEvent(EventOpened, details)
	if err != nil {
		return err
	}
	// Don't overwrite if they already clicked or submitted data
	if r.Status == EventClicked || r.Status == EventDataSubmit {
		return nil
	}
	r.Status = EventOpened
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleClickedLink updates a Result when the recipient clicks the link in an email.
func (r *Result) HandleClickedLink(details EventDetails) error {
	event, err := r.createEvent(EventClicked, details)
	if err != nil {
		return err
	}
	// Don't overwrite if they already submitted data
	if r.Status == EventDataSubmit {
		return nil
	}
	r.Status = EventClicked
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleFormSubmit updates a Result when the recipient submits data on a landing page.
func (r *Result) HandleFormSubmit(details EventDetails) error {
	event, err := r.createEvent(EventDataSubmit, details)
	if err != nil {
		return err
	}
	r.Status = EventDataSubmit
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// HandleEmailReport updates a Result when a user reports a phishing email.
func (r *Result) HandleEmailReport(details EventDetails) error {
	event, err := r.createEvent(EventReported, details)
	if err != nil {
		return err
	}
	r.Reported = true
	r.ModifiedDate = event.Time
	return db.Save(r).Error
}

// UpdateGeo updates the latitude and longitude of the result using MaxMind GeoIP.
func (r *Result) UpdateGeo(addr string) error {
	// Open MaxMind DB
	mmdb, err := maxminddb.Open("static/db/geolite2-city.mmdb")
	if err != nil {
		log.Fatal(err)
	}
	defer mmdb.Close()

	ip := net.ParseIP(addr)
	var city mmCity
	if err := mmdb.Lookup(ip, &city); err != nil {
		return err
	}
	// Update database record
	r.IP = addr
	r.Latitude = city.GeoPoint.Latitude
	r.Longitude = city.GeoPoint.Longitude
	return db.Save(r).Error
}

// generateResultId creates a random 7-character alphanumeric RId.
func generateResultId() (string, error) {
	const alphaNum = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	k := make([]byte, 7)
	for i := range k {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphaNum))))
		if err != nil {
			return "", err
		}
		k[i] = alphaNum[idx.Int64()]
	}
	return string(k), nil
}

// GenerateId assigns a unique RId to the result, ensuring no collision.
func (r *Result) GenerateId(tx *gorm.DB) error {
	for {
		rid, err := generateResultId()
		if err != nil {
			return err
		}
		r.RId = rid
		err = tx.Table("results").Where("r_id=?", r.RId).First(&Result{}).Error
		if err == gorm.ErrRecordNotFound {
			break
		}
	}
	return nil
}

// GetResult retrieves a Result by its RId.
func GetResult(rid string) (Result, error) {
	r := Result{}
	err := db.Where("r_id=?", rid).First(&r).Error
	return r, err
}
