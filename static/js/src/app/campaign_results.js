// ─────────────────────────────────────────────────────────────
// campaign_results.js  (unminified source, updated to match your HTML)
// ─────────────────────────────────────────────────────────────

var map = null;
var doPoll = true;
var setRefresh = null;

// status → CSS class + colors for timeline icons
var statuses = {
    "Email Sent":          { color: "#1abc9c", label: "label-success", icon: "fa-envelope",       point: "ct-point-sent"     },
    "Queued":              { label: "label-info" },
    "In progress":         { label: "label-primary" },
    "Completed":           { label: "label-success" },
    "Email Opened":        { color: "#4CAF50", label: "label-warning", icon: "fa-envelope-open",  point: "ct-point-opened"   },
    "Clicked Link":        { color: "#f05b4f", label: "label-clicked", icon: "fa-mouse-pointer", point: "ct-point-clicked"  },
    "Email Reported":      { color: "#45d6ef", label: "label-info",    icon: "fa-bullhorn",      point: "ct-point-reported" },
    "Error":               { color: "#6c7a89", label: "label-default", icon: "fa-times",         point: "ct-point-error"    },
    "Error Sending Email": { color: "#6c7a89", label: "label-default", icon: "fa-times",         point: "ct-point-error"    },
    "Submitted Data":      { color: "#f05b4f", label: "label-danger",  icon: "fa-exclamation",   point: "ct-point-clicked"  },
    "Unknown":             { color: "#6c7a89", label: "label-default", icon: "fa-question",      point: "ct-point-error"    },
    "Sending":             { color: "#428bca", label: "label-primary", icon: "fa-spinner",       point: "ct-point-sending"  },
    "Retrying":            { color: "#6c7a89", label: "label-default", icon: "fa-clock-o",       point: "ct-point-error"    },
    "Scheduled":           { color: "#428bca", label: "label-primary", icon: "fa-clock-o",       point: "ct-point-sending"  },
    "Campaign Created":    { label: "label-success", icon: "fa-rocket" }
};

// we’ll store the loaded campaign’s data here
var campaign = {
    stats: {}
};

/**
 * Output debug text to confirm that this file has loaded.
 */
console.debug("👀 campaign_results.js → load() called");

/**
 * Create a <span class="label …"> … </span> for a status.
 * If status is “Scheduled” or “Retrying,” attach a tooltip with the send date.
 */
function createStatusLabel(status, send_date) {
    var cls = statuses[status] ? statuses[status].label : "label-default";
    var labelHtml = '<span class="label ' + cls + '"';
    if (status === "Scheduled" || status === "Retrying") {
        labelHtml += ' data-toggle="tooltip" data-placement="top" data-html="true" ' +
                     'title="Scheduled to send at ' + send_date + '"';
    }
    labelHtml += '>' + status + '</span>';
    return labelHtml;
}

/**
 * Draw a Highcharts pie-chart with a big central number.
 *   opts.elemId → the DIV ID
 *   opts.title  → chart title
 *   opts.data   → array of { name: "...", y: <percent>, count: <absolute> }
 *   opts.colors → [primaryColor, greyColor]
 */
function renderPieChart(opts) {
    if (!document.getElementById(opts.elemId)) {
        return;
    }
    return Highcharts.chart(opts.elemId, {
        chart: {
            type: "pie",
            events: {
                load: function() {
                    var chart = this,
                        rend  = chart.renderer,
                        pie   = chart.series[0],
                        left  = chart.plotLeft + pie.center[0],
                        top   = chart.plotTop + pie.center[1];

                    this.innerText = rend.text(
                        opts.data[0].count, left, top
                    ).attr({
                        "text-anchor": "middle",
                        "font-size": "16px",
                        "font-weight": "bold",
                        "fill": opts.colors[0],
                        "font-family": "Helvetica,Arial,sans-serif"
                    }).add();
                },
                render: function() {
                    this.innerText && this.innerText.attr({
                        text: opts.data[0].count
                    });
                }
            }
        },
        title: { text: opts.title },
        plotOptions: {
            pie: {
                innerSize: "80%",
                dataLabels: { enabled: false }
            }
        },
        credits: { enabled: false },
        tooltip: {
            formatter: function() {
                if (!this.key) { return false; }
                return '<span style="color:' + this.color + '">●</span> ' +
                       this.point.name + ": <b>" + this.y + "%</b><br/>";
            }
        },
        series: [{
            data: opts.data,
            colors: opts.colors
        }]
    });
}

/**
 * Render a Highcharts line timeline.
 *   chartopts.data → [ { email: "...", message: "...", x: <epoch>, y: 1, marker: { fillColor: "<color>" } }, … ]
 */
function renderTimelineChart(chartopts) {
    if (!document.getElementById("timeline_chart")) {
        return;
    }
    return Highcharts.chart("timeline_chart", {
        chart: {
            zoomType: "x",
            type: "line",
            height: "200px"
        },
        title: { text: "Campaign Timeline" },
        xAxis: {
            type: "datetime",
            dateTimeLabelFormats: {
                second: "%l:%M:%S",
                minute: "%l:%M",
                hour:   "%l:%M",
                day:    "%b %d, %Y",
                week:   "%b %d, %Y",
                month:  "%b %Y"
            }
        },
        yAxis: {
            visible: false,
            min: 0,
            max: 2,
            tickInterval: 1,
            labels: { enabled: false },
            title:  { text: "" }
        },
        tooltip: {
            formatter: function() {
                return Highcharts.dateFormat(
                    "%A, %b %d %l:%M:%S %P",
                    new Date(this.x)
                ) +
                "<br>Event: " + this.point.message +
                "<br>Email: <b>" + this.point.email + "</b>";
            }
        },
        legend: { enabled: false },
        plotOptions: {
            series: {
                marker: {
                    enabled: true,
                    symbol: "circle",
                    radius: 3
                },
                cursor: "pointer"
            },
            line: {
                states: {
                    hover: { lineWidth: 1 }
                }
            }
        },
        credits: { enabled: false },
        series: [{
            data:       chartopts.data,
            dashStyle:  "shortdash",
            color:      "#cccccc",
            lineWidth:  1,
            turboThreshold: 0
        }]
    });
}

/**
 * For each row’s “Details” in the DataTable, build the per-recipient timeline display.
 * Input `data` looks like:
 *   [ rid, "<i#caret>", first_name, last_name, email, position, status, reported, send_date ]
 */
function renderTimeline(data) {
    var record = {
        id:         data[0],
        first_name: data[2],
        last_name:  data[3],
        email:      data[4],
        position:   data[5],
        status:     data[6],
        reported:   data[7],
        send_date:  data[8]
    };

    var resultsHtml = '<div class="timeline col-sm-12 well well-lg">' +
        '<h6>Timeline for ' +
            escapeHtml(record.first_name) + ' ' + escapeHtml(record.last_name) +
        '</h6><span class="subtitle">Email: ' + escapeHtml(record.email) +
        '<br>Result ID: ' + escapeHtml(record.id) +
        '</span><div class="timeline-graph col-sm-6">';

    $.each(campaign.timeline, function(i, event) {
        if (!event.email || event.email !== record.email) {
            return true;
        }
        resultsHtml +=
            '<div class="timeline-entry">' +
                '<div class="timeline-bar"></div>' +
                '<div class="timeline-icon ' + statuses[event.message].label + '">' +
                    '<i class="fa ' + statuses[event.message].icon + '"></i>' +
                '</div>' +
                '<div class="timeline-message">' + escapeHtml(event.message) +
                    '<span class="timeline-date">' +
                        moment.utc(event.time).local().format("MMMM Do YYYY h:mm:ss a") +
                    '</span>';

        if (event.details) {
            var details = JSON.parse(event.details);

            // If “Clicked Link” or “Submitted Data,” show device info
            if (event.message === "Clicked Link" || event.message === "Submitted Data") {
                var ua = UAParser(details.browser["user-agent"]);
                var deviceString = '<div class="timeline-device-details">';
                var deviceIcon = "laptop";
                if (ua.device.type === "tablet" || ua.device.type === "mobile") {
                    deviceIcon = ua.device.type;
                }
                var deviceVendor = "";
                if (ua.device.vendor) {
                    deviceVendor = ua.device.vendor.toLowerCase();
                }
                var deviceName = ua.os.name || "Unknown";
                if (ua.os.name === "Mac OS") {
                    deviceVendor = "apple";
                } else if (ua.os.name === "Windows") {
                    deviceVendor = "windows";
                }
                if (ua.os.version) {
                    deviceName += " (OS Version: " + ua.os.version + ")";
                }
                deviceString +=
                    '<div class="timeline-device-os"><span class="fa fa-stack">' +
                        '<i class="fa fa-' + escapeHtml(deviceIcon) + ' fa-stack-2x"></i>' +
                        '<i class="fa fa-vendor-icon fa-' + escapeHtml(deviceVendor) + ' fa-stack-1x"></i>' +
                    "</span> " + escapeHtml(deviceName) + "</div>";

                var deviceBrowser = ua.browser.name || "Unknown";
                var browserIcon = ua.browser.name ? ua.browser.name.toLowerCase() : "info-circle";
                if (browserIcon === "ie") {
                    browserIcon = "internet-explorer";
                }
                var browserVersion = ua.browser.version ? "(Version: " + ua.browser.version + ")" : "";
                var browserString = 
                    '<div class="timeline-device-browser"><span class="fa fa-stack">' +
                        '<i class="fa fa-' + escapeHtml(browserIcon) + ' fa-stack-1x"></i>' +
                    "</span> " + deviceBrowser + " " + browserVersion +
                    "</div>";

                deviceString += browserString + "</div>";
                resultsHtml += deviceString;
            }

            // If “Submitted Data,” show “Replay Credentials” button + details table
            if (event.message === "Submitted Data") {
                resultsHtml +=
                    '<div class="timeline-replay-button">' +
                        '<button onclick="replay(' + i + ')" class="btn btn-success">' +
                            '<i class="fa fa-refresh"></i> Replay Credentials' +
                        '</button>' +
                    '</div>' +
                    '<div class="timeline-event-details"><i class="fa fa-caret-right"></i> View Details</div>';

                if (details.payload) {
                    resultsHtml +=
                        '<div class="timeline-event-results">' +
                            '<table class="table table-condensed table-bordered table-striped">' +
                            "<thead><tr><th>Parameter</th><th>Value(s)</th></tr></thead><tbody>";

                    Object.keys(details.payload).forEach(function(param) {
                        if (param === "rid") {
                            return;
                        }
                        resultsHtml +=
                            "<tr><td>" + escapeHtml(param) + "</td>" +
                            "<td>" + escapeHtml(details.payload[param]) + "</td></tr>";
                    });

                    resultsHtml += "</tbody></table></div>";
                }
            }

            // If error payload, show error details
            if (details.error) {
                resultsHtml +=
                    '<div class="timeline-event-details"><i class="fa fa-caret-right"></i> View Details</div>' +
                    '<div class="timeline-event-results">' +
                        '<span class="label label-default">Error</span> ' + details.error +
                    "</div>";
            }
        }

        resultsHtml += "</div></div>";
    });

    // If this result is Scheduled/Retrying, add that at the bottom
    if (record.status === "Scheduled" || record.status === "Retrying") {
        resultsHtml +=
            '<div class="timeline-entry">' +
                '<div class="timeline-bar"></div>' +
                '<div class="timeline-icon ' + statuses[record.status].label + '">' +
                    '<i class="fa ' + statuses[record.status].icon + '"></i>' +
                '</div>' +
                '<div class="timeline-message">Scheduled to send at ' + record.send_date + "</div>" +
            "</div>";
    }

    resultsHtml += "</div>";
    return resultsHtml;
}

/**
 * Replay a recipient’s “Submitted Data” by popping up a URL prompt and submitting a form.
 */
function replay(event_idx) {
    var request = campaign.timeline[event_idx];
    var details = JSON.parse(request.details);
    var url = null;

    var form = $("<form>").attr({ method: "POST", target: "_blank" });
    Object.keys(details.payload).forEach(function(param) {
        if (param === "rid") {
            return;
        }
        if (param === "__original_url") {
            url = details.payload[param];
            return;
        }
        $("<input>").attr({ name: param }).val(details.payload[param]).appendTo(form);
    });

    Swal.fire({
        title: "Where do you want the credentials submitted to?",
        input: "text",
        showCancelButton: true,
        inputPlaceholder: "http://example.com/login",
        inputValue: url || "",
        inputValidator: function(value) {
            return new Promise(function(resolve, reject) {
                if (value) {
                    resolve();
                } else {
                    reject("Invalid URL.");
                }
            });
        }
    }).then(function(result) {
        if (result.value) {
            url = result.value;
            form.attr({ action: url });
            form.appendTo("body").submit().remove();
        }
    });
}

/**
 * Delete this campaign (after confirmation).
 */
function deleteCampaign() {
    Swal.fire({
        title: "Are you sure?",
        text: "This will delete the campaign. This can’t be undone!",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete Campaign",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        showLoaderOnConfirm: true
    }).then(function(result) {
        if (result.value) {
            api.campaignId.delete(campaign.id)
                .success(function(msg) {
                    Swal.fire("Campaign Deleted!", "This campaign has been deleted!", "success");
                    setTimeout(function() { window.location.href = "/campaigns"; }, 500);
                })
                .error(function(data) {
                    Swal.fire("Error", data.responseJSON.message, "error");
                });
        }
    });
}

/**
 * Complete this campaign (stop further event processing).
 */
function completeCampaign() {
    Swal.fire({
        title: "Are you sure?",
        text: "Gophish will stop processing events for this campaign",
        type: "warning",
        showCancelButton: true,
        confirmButtonText: "Complete Campaign",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        showLoaderOnConfirm: true
    }).then(function(result) {
        if (result.value) {
            Swal.fire("Campaign Completed!", "This campaign has been completed!", "success");
            $("#complete_button").prop("disabled", true).text("Completed!");
            doPoll = false;
        }
    });
}

/**
 * Export “results” or “events” to CSV.
 */
function exportAsCSV(scope) {
    var exportHTML = $("#exportButton").html();
    var dataToExport = null;
    var filename = campaign.name + " - " + scope.charAt(0).toUpperCase() + scope.slice(1) + ".csv";

    if (scope === "results") {
        dataToExport = campaign.results;
    } else if (scope === "events") {
        dataToExport = campaign.timeline;
    }

    if (!dataToExport) {
        return;
    }

    $("#exportButton").html('<i class="fa fa-spinner fa-spin"></i>');
    var csvString = Papa.unparse(dataToExport, { escapeFormulae: true });
    var csvData = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(csvData, filename);
    } else {
        var csvURL = window.URL.createObjectURL(csvData);
        var dlLink = document.createElement("a");
        dlLink.href = csvURL;
        dlLink.setAttribute("download", filename);
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);
    }

    $("#exportButton").html(exportHTML);
}

/**
 * Called when “Refresh” is clicked: hide the button, show spinner, call poll(), then queue next in 60s.
 */
function refresh() {
    if (!doPoll) {
        return;
    }
    $("#refresh_message").show();
    $("#refresh_btn").hide();
    poll();
    clearTimeout(setRefresh);
    setRefresh = setTimeout(refresh, 60000);
}

/**
 * “Report” a recipient (flag as reported).
 */
function report_mail(rid, cid) {
    Swal.fire({
        title: "Are you sure?",
        text: "This result will be flagged as reported (RID: " + rid + ")",
        type: "question",
        showCancelButton: true,
        confirmButtonText: "Continue",
        confirmButtonColor: "#428bca",
        reverseButtons: true,
        allowOutsideClick: false,
        showLoaderOnConfirm: true
    }).then(function(result) {
        if (result.value) {
            api.campaignId.get(cid).success(function(c) {
                var report_url = new URL(c.url);
                report_url.pathname = "/report";
                report_url.search = "?rid=" + rid;
                fetch(report_url)
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error("HTTP error! Status: " + response.status);
                        }
                        refresh();
                    })
                    .catch(function(error) {
                        var errMsg = (error.message === "Failed to fetch")
                            ? "This might be due to Mixed Content or network issues."
                            : error.message;
                        Swal.fire({ title: "Error", text: errMsg, type: "error", confirmButtonText: "Close" });
                    });
            });
        }
    });
}

/**
 * “poll” queries /campaigns/:id/results and /campaigns/:id/stats, then:
 *   • Updates the timeline chart
 *   • Updates all four donuts
 *   • Updates the Results DataTable
 *   • Updates the Map bubbles
 */
function poll() {
    api.campaignId.results(campaign.id)
        .success(function(c) {
            campaign = c;

            api.campaignId.stats(campaign.id)
                .success(function(stats) {
                    campaign.stats = stats;

                    // ─── Update Timeline Chart ───
                    if ($("#timeline_chart").length > 0) {
                        var timeline_series_data = [];
                        $.each(campaign.timeline, function(i, event) {
                            var event_date = moment.utc(event.time).local();
                            timeline_series_data.push({
                                email:   event.email,
                                message: event.message,
                                x:       event_date.valueOf(),
                                y:       1,
                                marker: { fillColor: statuses[event.message] ? statuses[event.message].color : "#cccccc" }
                            });
                        });
                        var timelineChart = $("#timeline_chart").highcharts();
                        if (timelineChart && timelineChart.series.length) {
                            timelineChart.series[0].update({ data: timeline_series_data });
                        }
                    }

                    // ─── Update Four Donuts ───
                    var totalSent      = campaign.stats.sent || 0;
                    var realOpens      = campaign.stats.opened_real || 0;
                    var screenedOpens  = campaign.stats.opened_screened || 0;
                    var realClicks     = campaign.stats.clicked_real || 0;
                    var screenedClicks = campaign.stats.clicked_screened || 0;
                    var denominator    = (totalSent > 0) ? totalSent : 1;

                    // 1) Email Sent donut
                    if ($("#sent_chart").length > 0) {
                        var sentPct = Math.floor((totalSent / denominator) * 100);
                        renderPieChart({
                            elemId: "sent_chart",
                            title:  "Email Sent",
                            data: [
                                { name: "Sent", y: sentPct, count: totalSent },
                                { name: "", y: 100 - sentPct }
                            ],
                            colors: ["#1abc9c", "#dddddd"]
                        });
                    }

                    // 2) Email Screened donut (combine screened Opens & Clicks)
                    if ($("#screened_chart").length > 0) {
                        var screenedCount = Math.max(screenedOpens, screenedClicks);
                        var screenedPct   = Math.floor((screenedCount / denominator) * 100);
                        renderPieChart({
                            elemId: "screened_chart",
                            title:  "Email Screened",
                            data: [
                                { name: "Screened", y: screenedPct, count: screenedCount },
                                { name: "", y: 100 - screenedPct }
                            ],
                            colors: ["#FF9800", "#dddddd"]
                        });
                    }

                    // 3) Email Opened (Real) donut
                    if ($("#opened_chart").length > 0) {
                        var roPct = Math.floor((realOpens / denominator) * 100);
                        renderPieChart({
                            elemId: "opened_chart",
                            title:  "Email Opened",
                            data: [
                                { name: "Real Opens", y: roPct, count: realOpens },
                                { name: "", y: 100 - roPct }
                            ],
                            colors: ["#4CAF50", "#dddddd"]
                        });
                    }

                    // 4) Link Clicked (Real) donut
                    if ($("#clicked_chart").length > 0) {
                        var rcPct = Math.floor((realClicks / denominator) * 100);
                        renderPieChart({
                            elemId: "clicked_chart",
                            title:  "Link Clicked",
                            data: [
                                { name: "Real Clicks", y: rcPct, count: realClicks },
                                { name: "", y: 100 - rcPct }
                            ],
                            colors: ["#f05b4f", "#dddddd"]
                        });
                    }

                    // ─── Update Details DataTable ───
                    if ($("#resultsTable").length > 0) {
                        var resultsTable = $("#resultsTable").DataTable();
                        resultsTable.rows().every(function(rowIdx, tableLoop, rowLoop) {
                            var rowData = this.data();
                            var rid = rowData[0];

                            $.each(campaign.results, function(j, result) {
                                if (result.id == rid) {
                                    rowData[6] = result.status;
                                    rowData[7] = result.reported;
                                    rowData[8] = moment(result.send_date).format("MMMM Do YYYY, h:mm:ss a");
                                    resultsTable.row(rowIdx).data(rowData);
                                    if (row.child.isShown()) {
                                        $(row.node()).find("#caret")
                                            .removeClass("fa-caret-right")
                                            .addClass("fa-caret-down");
                                        row.child(renderTimeline(row.data())).show();
                                    }
                                    return false;
                                }
                            });
                        });
                        resultsTable.draw(false);
                    }

                    // ─── Update Map Bubbles ───
                    if (map) {
                        var bubbles = [];
                        $.each(campaign.results, function(i, result) {
                            if (result.latitude == 0 && result.longitude == 0) {
                                return true;
                            }
                            var found = false;
                            for (var k = 0; k < bubbles.length; k++) {
                                if (bubbles[k].name === result.ip) {
                                    bubbles[k].radius += 1;
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                bubbles.push({
                                    latitude:  result.latitude,
                                    longitude: result.longitude,
                                    name:      result.ip,
                                    fillKey:   "point",
                                    radius:    2
                                });
                            }
                        });
                        map.bubbles(bubbles);
                    }

                    // Re-enable tooltip & Refresh button
                    $('[data-toggle="tooltip"]').tooltip();
                    $("#refresh_message").hide();
                    $("#refresh_btn").show();
                })
                .error(function() {
                    console.error("Failed to fetch campaign stats");
                });
        });
}

/**
 * Called on initial load:
 *  • Fetch /campaigns/:id/results
 *  • Hide spinner, show content
 *  • Build DataTable, call renderTimelineChart(), draw map, then poll()
 */
function load() {
    // Pick up campaign ID from URL
    campaign.id = window.location.pathname.split("/").slice(-1)[0];

    api.campaignId.results(campaign.id)
        .success(function(c) {
            campaign = c;

            // Update <title>, hide spinner, show campaignResults
            $("title").text(campaign.name + " - Gophish");
            $("#loading").hide();
            $("#campaignResults").show();

            // If campaign already “Completed,” disable Complete button
            if (campaign.status === "Completed") {
                $("#complete_button").prop("disabled", true).text("Completed!");
                doPoll = false;
            }

            // ─── Build “Details” DataTable ───
            if ($("#resultsTable").length > 0) {
                var resultsTable = $("#resultsTable").DataTable({
                    destroy: true,
                    order: [ [2, "asc"] ],
                    columnDefs: [
                        { orderable: false, targets: "no-sort" },
                        { className: "details-control", targets: [1] },
                        { visible: false, targets: [0, 8] },
                        {
                            render: function(data, type, row) {
                                return createStatusLabel(data, row[8]);
                            },
                            targets: [6]
                        },
                        {
                            className: "text-center",
                            render: function(reported, type, row) {
                                if (type === "display") {
                                    if (reported) {
                                        return "<i class='fa fa-check-circle text-success'></i>";
                                    }
                                    return "<i role='button' class='fa fa-times-circle text-muted' " +
                                           "onclick='report_mail(\"" + row[0] + "\", \"" + campaign.id + "\");'></i>";
                                }
                                return reported;
                            },
                            targets: [7]
                        }
                    ]
                });

                resultsTable.clear();
                $.each(campaign.results, function(i, result) {
                    resultsTable.row.add([
                        result.id,
                        "<i id='caret' class='fa fa-caret-right'></i>",
                        escapeHtml(result.first_name) || "",
                        escapeHtml(result.last_name)  || "",
                        escapeHtml(result.email)      || "",
                        escapeHtml(result.position)   || "",
                        result.status,
                        result.reported,
                        moment(result.send_date).format("MMMM Do YYYY, h:mm:ss a")
                    ]);
                });
                resultsTable.draw();

                // Toggle each row’s child-timeline on click
                $("#resultsTable tbody").on("click", "td.details-control", function() {
                    var tr = $(this).closest("tr");
                    var row = resultsTable.row(tr);

                    if (row.child.isShown()) {
                        row.child.hide();
                        tr.removeClass("shown");
                        $(this).find("i").removeClass("fa-caret-down").addClass("fa-caret-right");
                    } else {
                        $(this).find("i").removeClass("fa-caret-right").addClass("fa-caret-down");
                        row.child(renderTimeline(row.data())).show();
                        tr.addClass("shown");
                    }
                });

                $('[data-toggle="tooltip"]').tooltip();
            }

            // ─── Draw initial Timeline Chart ───
            if ($("#timeline_chart").length > 0) {
                var timeline_data = [];
                $.each(campaign.timeline, function(i, event) {
                    var dt = moment.utc(event.time).local();
                    timeline_data.push({
                        email:   event.email,
                        message: event.message,
                        x:       dt.valueOf(),
                        y:       1,
                        marker: { fillColor: statuses[event.message] ? statuses[event.message].color : "#cccccc" }
                    });
                });
                renderTimelineChart({ data: timeline_data });
            }

            // ─── Initialize Map (if enabled) ───
            var use_map = JSON.parse(localStorage.getItem("gophish.use_map"));
            if (use_map && $("#resultsMap").length > 0) {
                $("#resultsMapContainer").show();
                map = new Datamap({
                    element: document.getElementById("resultsMap"),
                    responsive: true,
                    fills: {
                        defaultFill: "#ffffff",
                        point:       "#283F50"
                    },
                    geographyConfig: {
                        highlightFillColor: "#1abc9c",
                        borderColor:        "#283F50"
                    },
                    bubblesConfig: {
                        borderColor: "#283F50"
                    }
                });

                // Draw initial bubbles
                var bubbles = [];
                $.each(campaign.results, function(i, result) {
                    if (result.latitude == 0 && result.longitude == 0) return true;
                    var found = false;
                    for (var k = 0; k < bubbles.length; k++) {
                        if (bubbles[k].name === result.ip) {
                            bubbles[k].radius += 1;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        bubbles.push({
                            latitude:  result.latitude,
                            longitude: result.longitude,
                            name:      result.ip,
                            fillKey:   "point",
                            radius:    2
                        });
                    }
                });
                map.bubbles(bubbles);
            }

            // ─── Finally, start polling ───
            poll();
            clearTimeout(setRefresh);
            setRefresh = setTimeout(refresh, 60000);
        })
        .error(function() {
            $("#loading").hide();
            errorFlash("Campaign not found!");
        });
}

$(document).ready(function() {
    Highcharts.setOptions({ global: { useUTC: false } });
    load();
});
