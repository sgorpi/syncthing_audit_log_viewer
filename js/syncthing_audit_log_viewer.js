/**
 * Copyright (C) 2025 sgorpi
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/* eslint-env jquery */

var typingTimer;
var time_sort_descending = true;

function add_table_cell_with_time(row, time) {
    const cell = row.insertCell(0)
    cell.className = "nowrap";
    var display_time = time.replace("T", " &nbsp;");
    display_time = display_time.split(".")[0]

    cell.innerHTML = display_time;
}


var device_hash_to_name = {}
var device_name_to_hash = {}
var folders = []
function add_device_name_hash(name, hash) {
    if (!(name in device_name_to_hash)) {
        device_name_to_hash[name] = []
    }
    if (!device_name_to_hash[name].includes(hash)) {
        device_name_to_hash[name].push(hash);
    }
}
function fill_id_to_device_name_map(log_object_map) {
    Object.entries(log_object_map).forEach(([, jsonData]) => {
        var short_id = null
        if (jsonData["type"] == "DeviceConnected") {
            short_id = jsonData["data"]["id"].split("-")[0]
            device_hash_to_name[short_id] = jsonData["data"]["deviceName"];
            device_hash_to_name[jsonData["data"]["id"]] = jsonData["data"]["deviceName"];
            add_device_name_hash(jsonData["data"]["deviceName"], short_id);
            add_device_name_hash(jsonData["data"]["deviceName"], jsonData["data"]["id"]);
        } else if (jsonData["type"] == "StartupComplete") {
            short_id = jsonData["data"]["myID"].split("-")[0]
            device_hash_to_name[short_id] = "me";
            device_hash_to_name[jsonData["data"]["myID"]] = "me";
            add_device_name_hash("me", short_id);
            add_device_name_hash("me", jsonData["data"]["myID"]);
        } else if (jsonData["type"].includes("ChangeDetected")) {
            if (!folders.includes(jsonData["data"]["label"])) {
                folders.push(jsonData["data"]["label"])
            }
        }
    })
    console.log(device_hash_to_name)
    console.log(device_name_to_hash)
    // update label select
    const label_select = $("#label_select")
    label_select.empty()
    label_select.append($("<option>", { value: "", text: "- no label -" }))
    $.each(folders, function (idx, val) {
        label_select.append($("<option>", { value: val, text: val }))
        console.log("label: " + val)
    })
    label_select.data("plugin_multiSelect").updateMenuItems()

    const who_select = $("#who_select")
    who_select.empty()
    Object.keys(device_name_to_hash).forEach(who => {
        who_select.append($("<option>", { value: who, text: who }))
        console.log("who: " + who)
    })
    who_select.data("plugin_multiSelect").updateMenuItems()

    return device_hash_to_name;
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
        cell.innerHTML = get_device_name(device_hash_to_name, jsonData["data"]["modifiedBy"])

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
    cell.innerHTML = get_device_name(device_hash_to_name, jsonData["data"]["id"])

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


const type_display_function_map = {
    "LocalChangeDetected": add_table_row_change_detected,
    "RemoteChangeDetected": add_table_row_change_detected,
    "DeviceConnected": add_table_row_device_connection,
    "DeviceDisconnected": add_table_row_device_connection,
    "StartupComplete": add_table_row_startup_complete,
}
var log_object_map = {};
function display() {
    const tableBody = document.querySelector("#data_table tbody");
    const path_search = $("#path_search").val()
    const path_search_excluded = $("#path_search_exclude").is(":checked") && path_search.length > 0
    const who_selected = $("#who_select").val()
    const action_selected = $("#action_select").val()
    const label_selected = $("#label_select").val()
    console.log("Label selected: " + label_selected)

    var who_hashes = []
    if (who_selected.length > 0) {
        $.each(who_selected, function (idx, who) {
            who_hashes = who_hashes.concat(device_name_to_hash[who])
        })
        console.log(who_hashes)
    }
    function matches_user_filter(jsonData) {
        var ret = true
        if (who_hashes.length > 0) {
            ret &= (who_hashes.includes(jsonData["data"]["id"])
                || who_hashes.includes(jsonData["data"]["myID"])
                || who_hashes.includes(jsonData["data"]["modifiedBy"])
            );
        }
        if (action_selected.length > 0) {
            ret &= (action_selected.includes(jsonData["type"]) ||
                ("action" in jsonData["data"] && action_selected.includes("action__" + jsonData["data"]["action"]))
            );
        }
        if (label_selected.length > 0) {
            if ("label" in jsonData["data"]) {
                ret &= label_selected.includes(jsonData["data"]["label"])
            } else {
                ret = label_selected.includes("");
            }
        }
        if ("path" in jsonData["data"]) {
            ret &= path_search_excluded ^ (jsonData["data"]["path"].toLowerCase().includes(path_search));
        } else if ("id" in jsonData["data"]) {
            ret &= path_search_excluded ^ (jsonData["data"]["id"].toLowerCase().includes(path_search));
        } else if ("myID" in jsonData["data"]) {
            ret &= path_search_excluded ^ (jsonData["data"]["myID"].toLowerCase().includes(path_search));
        }
        return ret;
    }

    tableBody.innerHTML = "";
    var keys = Object.keys(log_object_map).sort();
    if (!time_sort_descending) {
        keys.reverse()
    }
    keys.forEach(time => {
        const jsonData = log_object_map[time];
        if (jsonData["type"] in type_display_function_map && matches_user_filter(jsonData)) {
            type_display_function_map[jsonData["type"]](tableBody, time, jsonData)
        }
    }
    )
}

function parse(auditlog_txt, file) {
    const resultDiv = $("#result");
    try {
        const lines = auditlog_txt.split("\n")
        var stored = 0;
        for (var line = 0; line < lines.length; line++) {
            try {
                if (lines[line].length < 2)
                    continue;
                const jsonData = JSON.parse(lines[line]);
                var time = jsonData["time"] ?? "";

                if (jsonData["type"] in type_display_function_map) { // reduce memory consumption
                    log_object_map[time] = jsonData;
                    stored++;
                }

            } catch (err) {
                resultDiv.append("Invalid JSON line " + line + ": '" + lines[line] + " -- " + err + "'<br/>");
            }
        }
        resultDiv.append("Loaded " + lines.length + " lines, storing " + stored + " from " + file.name + "<br />");
    } catch (err) {
        resultDiv.innerHTML += "Error parsing: " + err + "<br />";
    }
};


$(document).ready(function () {
    $("#parse_button").on("click", function () {
        const file_input = document.getElementById("file_input");
        const resultDiv = $("#result");

        resultDiv.html("");

        if (file_input.files.length === 0) {
            $("#parse_status").html("<span style='color: red;'>Please select a JSON file first.</span>")
            return;
        }
        var num_loaded = 0
        for (var i = 0; i < file_input.files.length; i++) {
            $("#parse_status").text("Parsing " + (i + 1) + "/" + file_input.files.length + "...")
            const file = file_input.files[i];
            const reader = new FileReader();
            reader.onload = function (e) {
                parse(e.target.result, file)
                num_loaded++;
                if (num_loaded === file_input.files.length) {
                    fill_id_to_device_name_map(log_object_map);
                    $("#parse_status").text("")
                    display()
                }
            };
            reader.readAsText(file);
        }
    });
    $("#time_head").on("click", function () {
        time_sort_descending = !time_sort_descending;
        $("#time_direction").html(time_sort_descending ? "&#9660;" : "&#9650;")
        console.log("time_clicked " + time_sort_descending)
        display()
    })
    $("#path_search").on("keyup", function () {
        clearTimeout(typingTimer)
        typingTimer = setTimeout(display, 300)
    })
    $("#path_search").on("keydown", function () {
        clearTimeout(typingTimer)
    })
    $("#path_search_exclude").on("change", function () {
        display();
    })
    $("#who_select").multiSelect({
        "allText": "- everyone -",
        "noneText": "- everyone -",
    })
    $("#who_select").on("change", function () {
        display()
    })

    $("#action_select").multiSelect({
        "allText": "- all -",
        "noneText": "- all -",
    })
    $("#action_select").on("change", function () {
        display()
    })

    $("#label_select").multiSelect({
        "allText": "- all -",
        "noneText": "- all -",
    })
    $("#label_select").on("change", function () {
        display()
    })

});
