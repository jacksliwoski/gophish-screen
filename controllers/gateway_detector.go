package controllers

import (
    "net"
    "strings"
)

// gatewayUASignatures lists substrings found in common email-gateway UAs.
var gatewayUASignatures = []string{
    "GoogleImageProxy",             // Gmail/Google image proxy
    "ms-office-web",                // Outlook/Exchange crawler (example)
    "Proofpoint",                   // Proofpoint scanner
    "Mimecast",                     // Mimecast scanner
    "Microsoft-Exchange-Transport", // Exchange crawler
    "Linux x86_64) AppleWebKit",    // generic Linux/Chrome bots
}

// gatewayCIDRs lists CIDR blocks belonging to common scanning services.
var gatewayCIDRs = []string{
    "66.249.84.0/24", // GoogleImageProxy IP range
    "34.0.0.0/8",     // AWS public IP block (very broad)
    "35.0.0.0/8",
	"37.0.0.0/8",
    "54.0.0.0/8",
	"52.0.0.0/8",
	"3.0.0.0/8",
	"18.0.0.0/8",
	"108.0.0.0/8",
}

var gatewayIPNets []*net.IPNet

func init() {
    for _, cidr := range gatewayCIDRs {
        if _, ipnet, err := net.ParseCIDR(cidr); err == nil {
            gatewayIPNets = append(gatewayIPNets, ipnet)
        }
    }
}

// isGatewayUA returns true if the User-Agent string matches any gateway signature.
func isGatewayUA(ua string) bool {
    lower := strings.ToLower(ua)
    for _, sig := range gatewayUASignatures {
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
    for _, ipnet := range gatewayIPNets {
        if ipnet.Contains(ip) {
            return true
        }
    }
    return false
}

// IsGatewayHit returns true if either UA or IP indicates a gateway hit.
func IsGatewayHit(ipStr, ua string) bool {
    if isGatewayUA(ua) {
        return true
    }
    if isGatewayIP(ipStr) {
        return true
    }
    return false
}
