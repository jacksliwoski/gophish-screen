package gateway

import (
    "net"
    "strings"
    "fmt"
    "sync"
)

// Default configuration - will be updated by active screening config
var defaultGatewayUASignatures = []string{
    "ms-office-web",                // Outlook/Exchange crawler
    "proofpoint",                   // Proofpoint scanner
    "mimecast",                     // Mimecast scanner
    "microsoft-exchange-transport", // Exchange crawler
    "linux x86_64) applewebkit",   // generic Linux/Chrome bots
}

var defaultGatewayCIDRs = []string{
    "34.0.0.0/8",     // AWS public IP block (very broad)
    "35.0.0.0/8",
    "37.0.0.0/8",
    "38.0.0.0/8",     // Added from frontend
    "54.0.0.0/8",
    "44.0.0.0/8",     // Added from frontend
    "52.0.0.0/8",
    "3.0.0.0/8",
    "18.0.0.0/8",
    "108.0.0.0/8",
    "212.0.0.0/8",    // Added from frontend
}

// Active configuration - protected by mutex for concurrent access
var (
    activeGatewayUASignatures []string
    activeGatewayCIDRs        []string
    gatewayIPNets             []*net.IPNet
    configMutex               sync.RWMutex
)

// UpdateGatewayConfig updates the active gateway detection configuration
func UpdateGatewayConfig(cidrs []string, uaSignatures []string) error {
    configMutex.Lock()
    defer configMutex.Unlock()
    
    // Update UA signatures
    activeGatewayUASignatures = make([]string, len(uaSignatures))
    copy(activeGatewayUASignatures, uaSignatures)
    
    // Update CIDR blocks
    activeGatewayCIDRs = make([]string, len(cidrs))
    copy(activeGatewayCIDRs, cidrs)
    
    // Parse CIDR blocks into IP networks
    gatewayIPNets = make([]*net.IPNet, 0)
    for _, cidr := range activeGatewayCIDRs {
        if _, ipnet, err := net.ParseCIDR(cidr); err == nil {
            gatewayIPNets = append(gatewayIPNets, ipnet)
        } else {
            fmt.Printf("[WARN] gateway_detector: invalid CIDR block: %s\n", cidr)
        }
    }
    
    fmt.Printf("[INFO] gateway_detector: updated config with %d CIDRs and %d UA signatures\n", 
        len(activeGatewayCIDRs), len(activeGatewayUASignatures))
    
    return nil
}

// getActiveUASignatures returns the current UA signatures
func getActiveUASignatures() []string {
    configMutex.RLock()
    defer configMutex.RUnlock()
    
    if len(activeGatewayUASignatures) == 0 {
        return defaultGatewayUASignatures
    }
    return activeGatewayUASignatures
}

// getActiveIPNets returns the current IP networks
func getActiveIPNets() []*net.IPNet {
    configMutex.RLock()
    defer configMutex.RUnlock()
    
    return gatewayIPNets
}

func init() {
    // Initialize with default configuration
    UpdateGatewayConfig(defaultGatewayCIDRs, defaultGatewayUASignatures)
}

// isGatewayUA returns true if the User-Agent string matches any gateway signature.
func isGatewayUA(ua string) bool {
    signatures := getActiveUASignatures()
    lower := strings.ToLower(ua)
    for _, sig := range signatures {
        if strings.Contains(lower, strings.ToLower(sig)) {
            return true
        }
    }
    return false
}

// isGatewayIP returns true if the request IP falls into a known gateway CIDR.
func isGatewayIP(ipStr string) bool {
    ip := net.ParseIP(ipStr)
    if ip == nil {
        return false
    }
    
    ipNets := getActiveIPNets()
    for _, ipnet := range ipNets {
        if ipnet.Contains(ip) {
            return true
        }
    }
    return false
}

// IsGatewayHit returns true if either UA or IP indicates a gateway hit.
// Updated to exactly match frontend clientIsGatewayHit function
func IsGatewayHit(ipStr, ua string) bool {
    fmt.Printf("[DEBUG] gateway_detector.IsGatewayHit: checking IP=%s UA=%s\n", ipStr, ua)
    
    if isGatewayUA(ua) {
        fmt.Printf("[DEBUG] gateway_detector.IsGatewayHit: UA match detected\n")
        return true
    }
    if isGatewayIP(ipStr) {
        fmt.Printf("[DEBUG] gateway_detector.IsGatewayHit: IP match detected\n")
        return true
    }
    
    fmt.Printf("[DEBUG] gateway_detector.IsGatewayHit: no match found\n")
    return false
}