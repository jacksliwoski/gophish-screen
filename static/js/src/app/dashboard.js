var campaigns = []
// statuses is a helper map to point result statuses to ui classes
var statuses = {
    "Email Sent": {
        color: "#1abc9c",
        label: "label-success",
        icon: "fa-envelope",
        point: "ct-point-sent"
    },
    "Emails Sent": {
        color: "#1abc9c",
        label: "label-success",
        icon: "fa-envelope",
        point: "ct-point-sent"
    },
    "In progress": {
        label: "label-primary"
    },
    "Queued": {
        label: "label-info"
    },
    "Completed": {
        label: "label-success"
    },
    "Email Opened": {
        color: "#f9bf3b",
        label: "label-warning",
        icon: "fa-envelope",
        point: "ct-point-opened"
    },
    "Email Reported": {
        color: "#45d6ef",
        label: "label-warning",
        icon: "fa-bullhorne",
        point: "ct-point-reported"
    },
    "Clicked Link": {
        color: "#F39C12",
        label: "label-clicked",
        icon: "fa-mouse-pointer",
        point: "ct-point-clicked"
    },
    "Success": {
        color: "#f05b4f",
        label: "label-danger",
        icon: "fa-exclamation",
        point: "ct-point-clicked"
    },
    "Error": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-times",
        point: "ct-point-error"
    },
    "Error Sending Email": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-times",
        point: "ct-point-error"
    },
    "Submitted Data": {
        color: "#f05b4f",
        label: "label-danger",
        icon: "fa-exclamation",
        point: "ct-point-clicked"
    },
    "Unknown": {
        color: "#6c7a89",
        label: "label-default",
        icon: "fa-question",
        point: "ct-point-error"
    },
    "Sending": {
        color: "#428bca",
        label: "label-primary",
        icon: "fa-spinner",
        point: "ct-point-sending"
    },
    "Campaign Created": {
        label: "label-success",
        icon: "fa-rocket"
    }
}

var statsMapping = {
    "sent": "Email Sent",
    "opened": "Email Opened",
    "email_reported": "Email Reported",
    "clicked": "Clicked Link",
    "submitted_data": "Submitted Data",
}

function deleteCampaign(idx) {
    if (confirm("Delete " + campaigns[idx].name + "?")) {
        api.campaignId.delete(campaigns[idx].id)
            .success(function (data) {
                successFlash(data.message)
                location.reload()
            })
    }
}

/* Renders a pie chart using the provided chartopts */
function renderPieChart(chartopts) {
    return Highcharts.chart(chartopts['elemId'], {
        chart: {
            type: 'pie',
            events: {
                load: function () {
                    var chart = this,
                        rend = chart.renderer,
                        pie = chart.series[0],
                        left = chart.plotLeft + pie.center[0],
                        top = chart.plotTop + pie.center[1];
                    this.innerText = rend.text(chartopts['data'][0].count, left, top).
                    attr({
                        'text-anchor': 'middle',
                        'font-size': '16px',
                        'font-weight': 'bold',
                        'fill': chartopts['colors'][0],
                        'font-family': 'Helvetica,Arial,sans-serif'
                    }).add();
                },
                render: function () {
                    this.innerText.attr({
                        text: chartopts['data'][0].count
                    })
                }
            }
        },
        title: {
            text: chartopts['title']
        },
        plotOptions: {
            pie: {
                innerSize: '80%',
                dataLabels: {
                    enabled: false
                }
            }
        },
        credits: {
            enabled: false
        },
        tooltip: {
            formatter: function () {
                if (this.key == undefined) {
                    return false
                }
                return '<span style="color:' + this.color + '">\u25CF</span>' + this.point.name + ': <b>' + this.y + '%</b><br/>'
            }
        },
        series: [{
            data: chartopts['data'],
            colors: chartopts['colors'],
        }]
    })
}

function generateStatsPieCharts(campaigns) {
    // Re-create an "opened" and "clicked" field for the summary pie-charts,
    // because generateStatsPieCharts still expects stats.opened / stats.clicked.
    // (You could remove this block if you rewrite generateStatsPieCharts entirely,
    // but this is the minimal change to preserve existing logic.)
    $.each(campaigns, function (i, c) {
        c.stats.opened = (c.stats.opened_real || 0) + (c.stats.opened_screened || 0);
        c.stats.clicked = (c.stats.clicked_real || 0) + (c.stats.clicked_screened || 0);
    });

    var stats_data = []
    var stats_series_data = {}
    var total = 0

    $.each(campaigns, function (i, campaign) {
        $.each(campaign.stats, function (status, count) {
            if (status == "total") {
                total += count
                return true
            }
            if (!stats_series_data[status]) {
                stats_series_data[status] = count;
            } else {
                stats_series_data[status] += count;
            }
        })
    })
    $.each(stats_series_data, function (status, count) {
        if (!(status in statsMapping)) {
            return true
        }
        status_label = statsMapping[status]
        stats_data.push({
            name: status_label,
            y: Math.floor((count / total) * 100),
            count: count
        })
        stats_data.push({
            name: '',
            y: 100 - Math.floor((count / total) * 100)
        })
        var stats_chart = renderPieChart({
            elemId: status + '_chart',
            title: status_label,
            name: status,
            data: stats_data,
            colors: [statuses[status_label].color, "#dddddd"]
        })

        stats_data = []
    });
}

function generateTimelineChart(campaigns) {
    var overview_data = []
    $.each(campaigns, function (i, campaign) {
        var campaign_date = moment.utc(campaign.created_date).local()
        campaign.y = 0
        // % Success = clicked_real (we can choose to use clicked_real / total)
        campaign.y += campaign.stats.clicked_real || 0
        campaign.y = Math.floor((campaign.y / campaign.stats.total) * 100)
        overview_data.push({
            campaign_id: campaign.id,
            name: campaign.name,
            x: campaign_date.valueOf(),
            y: campaign.y
        })
    })
    Highcharts.chart('overview_chart', {
        chart: {
            zoomType: 'x',
            type: 'areaspline'
        },
        title: {
            text: 'Phishing Success Overview'
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
                second: '%l:%M:%S',
                minute: '%l:%M',
                hour: '%l:%M',
                day: '%b %d, %Y',
                week: '%b %d, %Y',
                month: '%b %Y'
            }
        },
        yAxis: {
            min: 0,
            max: 100,
            title: {
                text: "% of Success"
            }
        },
        tooltip: {
            formatter: function () {
                return Highcharts.dateFormat('%A, %b %d %l:%M:%S %P', new Date(this.x)) +
                    '<br>' + this.point.name + '<br>% Success: <b>' + this.y + '%</b>'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            series: {
                marker: {
                    enabled: true,
                    symbol: 'circle',
                    radius: 3
                },
                cursor: 'pointer',
                point: {
                    events: {
                        click: function (e) {
                            window.location.href = "/campaigns/" + this.campaign_id
                        }
                    }
                }
            }
        },
        credits: {
            enabled: false
        },
        series: [{
            data: overview_data,
            color: "#f05b4f",
            fillOpacity: 0.5
        }]
    })
}

$(document).ready(function () {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    })
    api.campaigns.summary()
        .success(function (data) {
            $("#loading").hide()
            campaigns = data.campaigns

            // Inject a temporary "opened" and "clicked" for the row tooltips (optional).
            $.each(campaigns, function (i, c) {
                c.stats.opened = (c.stats.opened_real || 0) + (c.stats.opened_screened || 0);
                c.stats.clicked = (c.stats.clicked_real || 0) + (c.stats.clicked_screened || 0);
            });

            if (campaigns.length > 0) {
                $("#dashboard").show()

                // Initialize DataTable with exactly 9 columns (0–8)
                campaignTable = $("#campaignTable").DataTable({
                    columnDefs: [
                        { orderable: false, targets: "no-sort" },
                        { className: "color-sent", targets: [2] },
                        { className: "color-opened", targets: [3] },
                        { className: "color-clicked", targets: [4] },
                        { className: "color-success", targets: [5] },
                        { className: "color-reported", targets: [6] }
                    ],
                    order: [[1, "desc"]]
                });

                var campaignRows = []
                $.each(campaigns, function (i, campaign) {
                    var campaign_date = moment(campaign.created_date).format('MMMM Do YYYY, h:mm:ss a')
                    var label = statuses[campaign.status].label || "label-default";

                    // Build a tooltip of “real” counts, not including screened probes
                    var realOpens = campaign.stats.opened_real || 0
                    var realClicks = campaign.stats.clicked_real || 0

                    var quickStats;
                    if (moment(campaign.launch_date).isAfter(moment())) {
                        quickStats = 
                            "Scheduled to start: " + moment(campaign.launch_date).format('MMMM Do YYYY, h:mm:ss a') +
                            "<br><br>Number of recipients: " + campaign.stats.total
                    } else {
                        quickStats = 
                            "Launch Date: " + moment(campaign.launch_date).format('MMMM Do YYYY, h:mm:ss a') +
                            "<br><br>Number of recipients: " + campaign.stats.total +
                            "<br><br>Emails opened: " + realOpens +
                            "<br><br>Emails clicked: " + realClicks +
                            "<br><br>Submitted Credentials: " + campaign.stats.submitted_data +
                            "<br><br>Errors: " + campaign.stats.error +
                            "<br><br>Reported: " + campaign.stats.email_reported
                    }

                    // Now push exactly 9 array elements (columns 0–8)
                    campaignRows.push([
                        escapeHtml(campaign.name),              // col 0
                        campaign_date,                          // col 1
                        campaign.stats.sent,                    // col 2: “Emails Sent”
                        realOpens,                              // col 3: “Email Opened” (real only)
                        realClicks,                             // col 4: “Clicked Link” (real only)
                        campaign.stats.submitted_data,          // col 5
                        campaign.stats.email_reported,          // col 6
                        "<span class=\"label " + label + "\" data-toggle=\"tooltip\" data-placement=\"right\" data-html=\"true\" title=\"" + quickStats + "\">" + campaign.status + "</span>", // col 7
                        "<div class='pull-right'>\
                            <a class='btn btn-primary' href='/campaigns/" + campaign.id + "' data-toggle='tooltip' data-placement='left' title='View Results'>\
                                <i class='fa fa-bar-chart'></i>\
                            </a>\
                            <button class='btn btn-danger' onclick='deleteCampaign(" + i + ")' data-toggle='tooltip' data-placement='left' title='Delete Campaign'>\
                                <i class='fa fa-trash-o'></i>\
                            </button>\
                        </div>" // col 8: actions
                    ]);
                    $('[data-toggle="tooltip"]').tooltip();
                });

                campaignTable.rows.add(campaignRows).draw();

                // Build the summary pie‐charts and timeline chart
                generateStatsPieCharts(campaigns);
                generateTimelineChart(campaigns);
            } else {
                $("#emptyMessage").show()
            }
        })
        .error(function () {
            errorFlash("Error fetching campaigns")
        })
})
