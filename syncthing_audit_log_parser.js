/**
 * Copyright (C) 2025 sgorpi
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/.
 */

var typingTimer;

function add_table_cell_with_time(row, time) {
    const cell = row.insertCell(0)
    cell.className = "nowrap";
    var display_time = time.replace("T", " &nbsp;");
    display_time = display_time.split(".")[0]

    cell.innerHTML = display_time;
}


var device_map = {}
var folders = []
function fill_id_to_device_name_map(log_object_map) {
    Object.entries(log_object_map).forEach(([, jsonData]) => {
        var short_id = null
        if (jsonData["type"] == "DeviceConnected") {
            short_id = jsonData["data"]["id"].split("-")[0]
            device_map[short_id] = jsonData["data"]["deviceName"];
            device_map[jsonData["data"]["id"]] = jsonData["data"]["deviceName"];
        } else if (jsonData["type"] == "StartupComplete") {
            short_id = jsonData["data"]["myID"].split("-")[0]
            device_map[short_id] = "me";
            device_map[jsonData["data"]["myID"]] = "me";
        } else if (jsonData["type"].includes("ChangeDetected")) {
            if (!folders.includes(jsonData["data"]["label"])) {
                folders.push(jsonData["data"]["label"])
            }
        }
    })
    console.log(device_map)
    // update label select
    const label_select = $("#label_select")
    label_select.empty()
    label_select.append($("<option>", { value: "", text: "- no label -" }))
    $.each(folders, function (idx, val) {
        label_select.append($("<option>", { value: val, text: val }))
        console.log("label: " + val)
    })
    $("#label_select").data("plugin_multiSelect").updateMenuItems()

    return device_map;
}

function get_device_name(device_map, id) {
    if (id in device_map) {
        return device_map[id]
    }
    return id.split("-")[0];
}

function add_table_row_change_detected(tableBody, time, jsonData) {
    if (jsonData["data"]["type"] == "file") {
        const row = tableBody.insertRow(0)

        add_table_cell_with_time(row, time)

        // determine the basename of filepath in jsonData["data"]["path"], 
        // to compare with previous change and guess if a file moved (modified+deleted)
        // var path = jsonData["data"]["path"];
        // var basename = path.split("/").pop();

        const cell = row.insertCell(1)
        cell.className = "nowrap";
        cell.innerHTML = get_device_name(device_map, jsonData["data"]["modifiedBy"])

        var keys = ["action", "label", "path"]
        var idx = 2
        keys.forEach(key => {
            const cell = row.insertCell(idx++)
            if (idx < 5)
                cell.className = "nowrap";
            if (key == "action")
                cell.className += " " + jsonData["data"][key];
            cell.innerHTML = jsonData["data"][key] ?? "-";
        })
    }
}

function add_table_row_device_connection(tableBody, time, jsonData) {
    const row = tableBody.insertRow(0)
    add_table_cell_with_time(row, time)

    // determine the basename of filepath in jsonData["data"]["path"]
    var idx = 1
    var cell = row.insertCell(idx++)
    cell.className = "nowrap";
    cell.innerHTML = get_device_name(device_map, jsonData["data"]["id"])

    cell = row.insertCell(idx++)
    cell.className = "nowrap";
    cell.innerHTML = (jsonData["type"] == "DeviceConnected" ? "connected" : "disconnected");
    cell = row.insertCell(idx++)

    cell = row.insertCell(idx++)
    cell.className = "grey";
    cell.innerHTML = jsonData["data"]["id"]
    if (jsonData["type"] == "DeviceConnected") {
        cell.innerHTML += " (" + jsonData["data"]["clientName"] + " " + jsonData["data"]["clientVersion"] + ")";
    }
}

function add_table_row_startup_complete(tableBody, time, jsonData) {
    const row = tableBody.insertRow(0)
    add_table_cell_with_time(row, time)

    // determine the basename of filepath in jsonData["data"]["path"]
    var idx = 1
    var cell = row.insertCell(idx++)
    cell.className = "nowrap";
    cell.innerHTML = "me"

    cell = row.insertCell(idx++)
    cell.className = "nowrap";
    cell.innerHTML = "started"
    cell = row.insertCell(idx++)

    cell = row.insertCell(idx++)
    cell.className = "grey";
    cell.innerHTML = jsonData["data"]["myID"]
}


var log_object_map = {};
function display() {
    const type_map = {
        "LocalChangeDetected": add_table_row_change_detected,
        "RemoteChangeDetected": add_table_row_change_detected,
        "DeviceConnected": add_table_row_device_connection,
        "DeviceDisconnected": add_table_row_device_connection,
        "StartupComplete": add_table_row_startup_complete,
    }
    const tableBody = document.querySelector("#dataTable tbody");
    const path_search = $("#path_search").val()
    const label_selected = $("#label_select").val()
    console.log("Label selected: " + label_selected)

    function matches_user_filter(jsonData) {
        var ret = true
        if (label_selected.length > 0) {
            if ("label" in jsonData["data"]) {
                ret &= label_selected.includes(jsonData["data"]["label"])
            } else {
                ret = label_selected.includes("");
            }
        }
        if ("path" in jsonData["data"]) {
            ret &= (jsonData["data"]["path"].toLowerCase().includes(path_search));
        } else if ("id" in jsonData["data"]) {
            ret &= (jsonData["data"]["id"].toLowerCase().includes(path_search));
        } else if ("myID" in jsonData["data"]) {
            ret &= (jsonData["data"]["myID"].toLowerCase().includes(path_search));
        }
        return ret;
    }

    tableBody.innerHTML = "";
    Object.keys(log_object_map).sort().forEach(time => {
        const jsonData = log_object_map[time];
        //console.log("Parsing: " + time + " = " + JSON.stringify(jsonData, null, 2))
        if (jsonData["type"] in type_map && matches_user_filter(jsonData)) {
            type_map[jsonData["type"]](tableBody, time, jsonData)
        } else {
            //console.log("Ignored " + jsonData["type"])
        }
    }
    )
}

function parse(auditlog_txt, file) {
    const resultDiv = $("#result");
    try {
        const lines = auditlog_txt.split("\n")
        for (var line = 0; line < lines.length; line++) {
            try {
                if (lines[line].length < 2)
                    continue;
                const jsonData = JSON.parse(lines[line]);
                var time = jsonData["time"] ?? "";
                log_object_map[time] = jsonData;

            } catch (err) {
                resultDiv.append("Invalid JSON line " + line + ": '" + lines[line] + " -- " + err + "'<br/>");
            }
        }
        resultDiv.append("Loaded " + lines.length + " lines of log from " + file.name + "<br />");
    } catch (err) {
        resultDiv.innerHTML += "Error parsing: " + err + "<br />";
    }
};


$(document).ready(function () {
    //alert('loaded')
    $("#parseBtn").on("click", function () {
        const fileInput = document.getElementById("fileInput");
        const resultDiv = $("#result");

        resultDiv.html("");

        if (fileInput.files.length === 0) {
            resultDiv.append("Please select a JSON file first.");
            return;
        }
        var num_loaded = 0
        for (var i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const reader = new FileReader();
            reader.onload = function (e) {
                parse(e.target.result, file)
                num_loaded++;
                if (num_loaded === fileInput.files.length) {
                    fill_id_to_device_name_map(log_object_map);
                    display()
                }
            };
            reader.readAsText(file);
        }
    });
    $("#path_search").on("keyup", function () {
        clearTimeout(typingTimer)
        typingTimer = setTimeout(display, 300)
    })
    $("#path_search").on("keydown", function () {
        clearTimeout(typingTimer)
    })
    $("#label_select").multiSelect({
        "allText": "-- everything --",
        "noneText": "-- everything --",
    })
    $("#label_select").on("change", function () {
        display()
    })

});
