function startWatchingProjectListUpdate(api, initialProjects, onUpdate) {
    function haveDifferences(lastProjects, projects) {
        if (lastProjects.length !== projects.length) return true;

        var lastSorted = _.sortBy(lastProjects, function(it) { return it.id; });
        var sorted = _.sortBy(projects, function(it) { return it.id; });
        var zipped = _.zip(lastSorted, sorted);
        return !_.every(zipped, function(pair) {
            return pair[0].id === pair[1].id && pair[0].name === pair[1].name
                && _.isEqual(pair[0].visualizations, pair[1].visualizations);
        });
    }

    var lastProjects = initialProjects;

    var doProjectListUpdate = function() {
        var projects = api.listProjects();
        if (haveDifferences(lastProjects, projects)) {
            onUpdate(lastProjects, projects);
        }
        lastProjects = projects;
        setTimeout(doProjectListUpdate, 1000);
    };
    doProjectListUpdate();
}

function startWatchingProjectStatusUpdate(api, initialProjects, onChange) {
    var lastProjects = initialProjects;

    var doProjectsStatusUpdate = function() {
        var projects = api.listProjects();
        _.each(projects, function(project) {
            var lastProject = _.find(lastProjects, function(it){ return it.id === project.id; });
            if (lastProject === undefined) return;
            onChange(lastProject, project);
        });
        lastProjects = projects;
        setTimeout(doProjectsStatusUpdate, 1000);
    };
    doProjectsStatusUpdate();
}

function updateProjectsDropDownIn(root, projects, links) {
    var projectItems = projects.map(function(it) {
        return menuItem(it.name, true, links.visualizeAll(it.id));
    });
    if (_.isEmpty(projectItems)) {
        projectItems = [{name: "No Projects", type: "disabled", href: "", visible: true}];
    }

    var menuItems = _.flatten([
        projectItems,
        menuSeparator(),
        menuItem("Add Project", true, links.newProjectSettings)
    ]).filter(_.property("visible"));

    root.children("li").remove();
    menuItems.forEach(function(item) {
        var itemClass = item.type === "separator" ? "divider" : "";
        if (item.type === "disabled") itemClass = "disabled";
        var linkStyle = item.type === "separator" ? "none" : "";
        root.append("" +
            "<li class='" + itemClass + "'>" +
                "<a href='" + item.href + "' style='display: " + linkStyle + "'>" + item.name + "</a>" +
            "</li>"
        );
    });
}

function updateGeneralSettingsLink(root, links) {
    root.attr("href", links.generalSettings);
}

function menuSeparator(isVisible) {
    return {
        type: "separator",
        visible: (isVisible === undefined ? true : isVisible)
    };
}

function menuItem(name, isVisible, hrefOrCallback) {
    var href = _.isString(hrefOrCallback) ? hrefOrCallback : "";
    var callback = _.isFunction(hrefOrCallback) ? hrefOrCallback : null;
    return {
        name: name,
        visible: (isVisible === undefined ? true : isVisible),
        href: href,
        callback: callback
    };
}


//noinspection JSUnusedGlobalSymbols
function newClientServerApi(initialState) {
    var projects = initialState.projects;
    var generalSettings = initialState.generalSettings;

    var it = {};
    it.listProjects = function() {
        return projects;
    };
    it.updateProject = function(projectSettings, onSuccess, onFailure) {
        ajaxPostDataTo("/update-project", projectSettings, onSuccess, onFailure);
    };
    it.deleteProject = function(projectSettings, onSuccess, onFailure) {
        ajaxPostDataTo("/delete-project", projectSettings, onSuccess, onFailure);
    };
    it.createProject = function(projectSettings, onSuccess, onFailure) {
        ajaxPostDataTo("/create-project", projectSettings, onSuccess, onFailure);
    };
    it.newProjectSettingsTemplate = newProjectSettingsTemplate;
    it.generalSettings = function() {
        return generalSettings;
    };
    it.updateGeneralSettings = function(settings, onSuccess, onFailure) {
        ajaxPostDataTo("/update-general-settings", settings, onSuccess, onFailure);
    };
    it.updateFromVcs = function(projectSettings) {
        ajaxPostDataTo("/update-visualization", projectSettings);
    };
    it.cleanUpdateFromVcs = function(projectSettings) {
        ajaxPostDataTo("/clean-update-visualization", projectSettings);
    };
    it.cancelUpdateFromVcs = function(projectSettings) {
        ajaxPostDataTo("/cancel-visualization-update", projectSettings);
    };
    it.goBack = function() {
        var lastUrl = document.referrer;
        if (lastUrl === undefined || lastUrl === null || lastUrl === "") {
            window.location.href = window.location.origin + api.links.projectList;
        } else {
            window.history.back();
        }
    };
    it.onServerConnection = function(isConnected){};
    it.links = {
        projectList: "/project-list",
        projectSettings: function(projectId) { return "/project-settings?id=" + projectId; },
        newProjectSettings: "/new-project-settings",
        generalSettings: "/settings",
        visualizeAll: function(projectId) { return "/visualize?id=" + projectId + "&type=all"; },
        visualize: function(projectId, visualization) { return "/visualize?id=" + projectId + "&type=" + visualization; }
    };

    function ajaxPostDataTo(url, data, onSuccess, onFailure) {
        $.ajax(url, {dataType: "json", data: JSON.stringify(data), type: "post"})
            .done(function(data) {
                var failed = !_.isEmpty(data);
                if (!failed && onSuccess !== undefined) onSuccess();
                if (failed && onFailure !== undefined) onFailure(data);
            })
            .fail(function(xhr, error) {
                if (onFailure !== undefined) onFailure({failureMessage: "internal error"});
                console.log(xhr);
                console.log(error);
            });
    }
    function updateFromServer() {
        var onDisconnect = function(){ it.onServerConnection(false); };
        $.ajax("/get-current-settings", {dataType: "json", timeout: 2000, statusCode: {0: onDisconnect}})
            .done(function(update) {
                projects = update.projects;
                generalSettings = update.generalSettings;
                it.onServerConnection(true);
            })
            .fail(function(xhr, textStatus) {
                // console.log(xhr);
                // console.log(textStatus);
            });
        setTimeout(updateFromServer, 1000);
    }
    setTimeout(updateFromServer, 1000);

    return it;
}

function newFakeClientServerApi(initialState) {
    var projects = initialState.projects;
    var generalSettings = initialState.generalSettings;

    var it = {};
    it.listProjects = function() {
        return projects;
    };
    it.updateProject = function(projectSettings, onSuccess, onFailure) {
        console.log("Updated project settings:");
        console.log(projectSettings);
    };
    it.deleteProject = function(projectSettings, onSuccess, onFailure) {
        console.log("Deleted project:");
        console.log(projectSettings);
    };
    it.createProject = function(projectSettings, onSuccess, onFailure) {
        console.log("Created project:");
        console.log(projectSettings);
    };
    it.newProjectSettingsTemplate = newProjectSettingsTemplate;
    it.generalSettings = function() {
        return generalSettings;
    };
    it.updateGeneralSettings = function(settings, onSuccess, onFailure) {
        console.log("Updated settings:");
        console.log(settings);
    };
    it.updateFromVcs = function(projectSettings) {
        console.log("VCS update: " + projectSettings.name);
    };
    it.cleanUpdateFromVcs = function(projectSettings) {
        console.log("Clean VCS update: " + projectSettings.name);
    };
    it.cancelUpdateFromVcs = function(projectSettings) {
        console.log("Cancel update: " + projectSettings.name);
    };
    it.goBack = function() {};
    it.onServerConnection = function(isConnected){};
    it.links = {
        projectList: "#",
        projectSettings: function(projectId) { return "#"; },
        newProjectSettings: "#",
        generalSettings: "#",
        visualizeAll: function(projectId) { return "#"; },
        visualize: function(projectId, visualization) { return "#"; }
    };

    var updateCounter = 0;
    var cucumber = initialState.projects[1];
    function updatedProjects() {
        var result = fakeInitialState();
        cucumber = _.extend({}, cucumber);

        if (cucumber.status.progressPercents < 100 && cucumber.status.progressPercents !== -1) {
            var status1 = {
                statusType: "Grabbing",
                description: "",
                errors: [],
                progressPercents: cucumber.status.progressPercents + 5
            };
            cucumber = _.extend(cucumber, {status: status1});
        } else {
            var status2 = {
                statusType: "UpToDate",
                description: "Failed to clone",
                errors: ["Cloning into 'projects/3/src/0'...", "fatal: repository 'https://github.com/yourproject/' not found"],
                progressPercents: -1
            };
            cucumber = _.extend(cucumber, {status: status2});
            it.onServerConnection(false);
        }
        result.projects[1] = cucumber;

        if (updateCounter >= 2) {
            result.projects[0].name = "JUnit";
        }
        if (updateCounter === 6) {
            it.onServerConnection(true);
        } else if (updateCounter === 9) {
            it.onServerConnection(false);
        }

        updateCounter++;
        return result.projects;
    }
    function update() {
        projects = updatedProjects();
        setTimeout(update, 1000);
    }
    setTimeout(update, 1000);

    return it;
}

function fakeInitialState() {
    return {
        generalSettings: {
            gitPath: "git",
            hgPath: "hg",
            svnPath: "svn",
            defaultFileCharset: "UTF-8",
            svnUseMergeHistoryFlag: false,
            verboseLogging: false,
            allVcsTypes: ["git", "hg", "svn"],
            allVisualizations: [
                "Code Churn Chart",
                "Amount Of Committers Chart",
                "Committers Changing Same Files Graph"
            ],
            newCodeMinerVersionIsAvailable: true
        },
        projects: [
            {
                id: 1,
                name: "JUnit",
                status: {
                    statusType: "Updated",
                    nextStatusType: "",
                    description: "",
                    errors: [],
                    progressPercents: -1,
                    cancelling: false
                },
                historyRange: {
                    from: "01/01/2010",
                    to: "01/01/2014"
                },
                historyTillToday : false,
                updateSchedule: {
                    cron: "* * */1 * *"
                },
                defaultFileCharset: "UTF-8",
                miners: [],
                visualizations: [
                    "Code Churn Chart",
                    "Amount Of Committers Chart",
                    "Committers Changing Same Files Graph"
                ],
                vcsRoots: [
                    {id: 1, vcsType: "git", url: "https://github.com/junit-team/junit"}
                ]
            },
            {
                id: 2,
                name: "Cucumber",
                status: {
                    statusType: "Grabbing",
                    nextStatusType: "Updated",
                    description: "",
                    errors: [],
                    progressPercents: 85,
                    cancelling: false
                },
                historyRange: {
                    from: "01/01/2011",
                    to: "01/01/2013"
                },
                historyTillToday: true,
                updateSchedule: {
                    cron: "* * */1 * *"
                },
                defaultFileCharset: "UTF-8",
                miners: [],
                visualizations: [
                    "Code Churn Chart",
                    "Amount Of Committers Chart"
                ],
                vcsRoots: [
                    {id: 1, vcsType: "git", url: "https://github.com/cucumber/cucumber"},
                    {id: 2, vcsType: "git", url: "https://github.com/cucumber/cucumber-js"}
                ]
            }
        ]
    };
}


function allVisualizations() {
    return [
        "Code Churn Chart",
        "Amount Of Committers Chart",
        "Amount Of Commits By Committer Chart",
        "Amount Of TODOs Chart",
        "Amount Of Files In Commit Chart",
        "Amount Of Changing Files Chart",
        "Change Size By File Type Chart",
        "Files In The Same Commit Graph",
        "Committers Changing Same Files Graph",
        "Changes Treemap",
        "Commit Time Punchcard",
        "Time Between Commits Histogram",
        "Commit Messages Word Chart",
        "Commit Messages Word Cloud"
    ];
}
function allVcsTypes() {
    return ["git", "hg", "svn"];
}

function newProjectSettingsTemplate() {
    return {
        id: -1,
        name: "",
        status: {
            statusType: "NotInitialized",
            nextStatusType: "",
            description: "",
            errors: [],
            progressPercents: -1,
            cancelling: false
        },
        historyRange: {
            from: "01/01/2010",
            to: "01/01/2014"
        },
        historyTillToday: true,
        updateSchedule: {
            cron: "0 0 0 ? * *"
        },
        defaultFileCharset: "UTF-8",
        miners: ["linesAndCharsDiff", "todosDiff"],
        vcsRoots: [
            {id:0, vcsType: "git", url: "https://github.com/yourproject"}
        ],
        visualizations: [
            "Code Churn Chart",
            "Amount Of Committers Chart",
            "Committers Changing Same Files Graph"
        ]
    };
}

function statusTypeAsString(status) {
    var type = status.statusType;
    var nextType = status.nextStatusType;

    if (nextType === "Cloned") return "Cloning";
    else if (nextType === "Grabbed") return "Grabbing history";
    else if (nextType === "Visualized") return "Visualizing";

    if (type === "NotInitialized") return "Not initialized";
    else if (type === "Cloned") return "Cloned";
    else if (type === "Grabbed") return "Grabbed history";
    else if (type === "Visualized") return "Created visualizations";
    else if (type === "Updated") return "Up-to-date";
    else return type;
}
function statusDescriptionAsString(status) {
    return status.description;
}
function statusErrorsAsString(status) {
    if (_.isEmpty(status.errors)) return "";
    return status.errors.map(function(it) {
        return it.trim().replace(/\n/g, "<br/>").replace(/\t/g, "&nbsp;&nbsp;");
    }).join("<br/>");
}
function statusHasChanged(before, after) {
    var attributes = ["statusType", "nextStatusType", "description", "errors", "progressPercents", "cancelling"];
    return _.some(attributes, function(attribute) {
        return !_.isEqual(before[attribute], after[attribute]);
    });
}