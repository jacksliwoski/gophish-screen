package controllers

import (
    "net"
    "strings"
)

// A small list of substrings commonly seen in email-gateway User-Agents.
var gatewayUASignatures = []string{
    "GoogleImageProxy",             // Gmail/Google image proxy
    "ms-office-web",                // Outlook/Exchange crawler (example)
    "Proofpoint",                   // Proofpoint scanner
    "Mimecast",                     // Mimecast scanner
    "Microsoft-Exchange-Transport", // Exchange crawler
    "Linux x86_64) AppleWebKit",    // generic Linux/Chrome bots
}

// A list of CIDRs known to host common gateway scanners.
var gatewayCIDRs = []string{
    "66.249.84.0/24", // GoogleImageProxy IP block
    "34.0.0.0/8",     // AWS IP ranges (broad; refine if desired)
    "35.0.0.0/8",
    "54.0.0.0/8",
}

// Pre-parse the gateway CIDRs once at init-time.
var gatewayIPNets []*net.IPNet

func init() {
    for _, cidr := range gatewayCIDRs {
        if _, ipnet, err := net.ParseCIDR(cidr); err == nil {
            gatewayIPNets = append(gatewayIPNets, ipnet)
        }
    }
}

// isGatewayUA returns true if the User-Agent matches any known gateway signature.
func isGatewayUA(ua string) bool {
    lowerUA := strings.ToLower(ua)
    for _, sig := range gatewayUASignatures {
        if strings.Contains(lowerUA, strings.ToLower(sig)) {
            return true
        }
    }
    return false
}

// isGatewayIP returns true if the IP falls into any parsed gateway CIDR.
func isGatewayIP(ipStr string) bool {
    ip := net.ParseIP(ipStr)
    if ip == nil {
        return false
    }
    for _, ipnet := range gatewayIPNets {
        if ipnet.Contains(ip) {
            return true
        }
    }
    return false
}

// IsGatewayHit combines UA + IP tests: if either matches, treat as “screened.”
func IsGatewayHit(ipStr, ua string) bool {
    if isGatewayUA(ua) {
        return true
    }
    if isGatewayIP(ipStr) {
        return true
    }
    return false
}
