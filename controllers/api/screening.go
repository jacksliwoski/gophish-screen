package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	ctx "github.com/gophish/gophish/context"
	log "github.com/gophish/gophish/logger"
	"github.com/gophish/gophish/models"
	"github.com/gorilla/mux"
)

// ScreeningConfigs handles screening configuration management
func (as *Server) ScreeningConfigs(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		configs, err := models.GetScreeningConfigs(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error retrieving screening configurations"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, configs, http.StatusOK)
	case r.Method == "POST":
		config := models.ScreeningConfig{}
		err := json.NewDecoder(r.Body).Decode(&config)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure"}, http.StatusBadRequest)
			return
		}
		err = models.PostScreeningConfig(&config, ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, config, http.StatusCreated)
	}
}

// ScreeningConfig handles individual screening configuration management
func (as *Server) ScreeningConfig(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	config, err := models.GetScreeningConfig(id, ctx.Get(r, "user_id").(int64))
	if err != nil {
		log.Error(err)
		JSONResponse(w, models.Response{Success: false, Message: "Screening configuration not found"}, http.StatusNotFound)
		return
	}
	switch {
	case r.Method == "GET":
		JSONResponse(w, config, http.StatusOK)
	case r.Method == "PUT":
		err := json.NewDecoder(r.Body).Decode(&config)
		if err != nil {
			JSONResponse(w, models.Response{Success: false, Message: "Invalid JSON structure"}, http.StatusBadRequest)
			return
		}
		config.Id = id
		err = models.PutScreeningConfig(&config, ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: err.Error()}, http.StatusBadRequest)
			return
		}
		JSONResponse(w, config, http.StatusOK)
	case r.Method == "DELETE":
		err = models.DeleteScreeningConfig(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error deleting screening configuration"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Screening configuration deleted successfully!"}, http.StatusOK)
	}
}

// ScreeningConfigSummary returns summary information about screening configurations
func (as *Server) ScreeningConfigSummary(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "GET":
		summaries, err := models.GetScreeningConfigSummaries(ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error retrieving screening configuration summaries"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, summaries, http.StatusOK)
	}
}

// ScreeningConfigApply applies a screening configuration
func (as *Server) ScreeningConfigApply(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 0, 64)
	switch {
	case r.Method == "POST":
		// Get the configuration
		config, err := models.GetScreeningConfig(id, ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Screening configuration not found"}, http.StatusNotFound)
			return
		}
		
		// Disable all other configs for this user
		err = models.PutScreeningConfig(&config, ctx.Get(r, "user_id").(int64))
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error applying screening configuration"}, http.StatusInternalServerError)
			return
		}
		
		// Apply the configuration to the gateway detector
		err = models.ApplyScreeningConfig(config)
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error updating gateway detector"}, http.StatusInternalServerError)
			return
		}
		
		JSONResponse(w, models.Response{Success: true, Message: "Screening configuration applied successfully!"}, http.StatusOK)
	}
}

// ScreeningConfigDefault creates a default screening configuration
func (as *Server) ScreeningConfigDefault(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == "POST":
		uid := ctx.Get(r, "user_id").(int64)
		err := models.EnsureDefaultScreeningConfig(uid)
		if err != nil {
			log.Error(err)
			JSONResponse(w, models.Response{Success: false, Message: "Error creating default screening configuration"}, http.StatusInternalServerError)
			return
		}
		JSONResponse(w, models.Response{Success: true, Message: "Default screening configuration created successfully!"}, http.StatusOK)
	}
}