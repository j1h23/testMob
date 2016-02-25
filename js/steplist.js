var FilteredListDataSummary;

$(document).ready(function () {
    StepSummaryContentList = [{
        StepIndex: "Title",
        StepContent: ProcedureTitle,
        StepTreeLine: ProcedureTitle,
        Children: StepSummaryContentList[0],
    }];
    FilteredListDataSummary = FlattenData(StepSummaryContentList);
    InitializeKendo();
    InitializeTreeViewCheckMark();
    PreSelect();
    ShowHideFlatList();
});

function InitializeKendo() {
    InitializeTreeViewAll();
}

function InitializeTreeViewAll() {
    var treeViewAllData = new kendo.data.HierarchicalDataSource({
        data: StepSummaryContentList,
        schema: {
            model: {
                id: "StepIndex",
                children: "Children"
            }
        }
    });
    $("#treeView").kendoTreeView({
        dataSource: treeViewAllData,
        dataTextField: "StepTreeLine",
        template: "<img src=\"images/check.png\" id=\"check-viewed#= item.StepIndex #\" style=\"display:none;\"/>#= item.StepTreeLine #",
        loadOnDemand: false,
        select: onSelect,
    });
}

function onSelect(e) {
    var stepIndex = $("#treeView").data('kendoTreeView').dataItem(e.node).id;
    if (stepIndex !== "Title") {
        parent.CloseStepListAndNavigate(stepIndex);
    }
}
function PreSelect() {
    var selectTreeNode,
        selectTreeNodeDataItem,
        currentIndex = parent.CurrentStepIndex,
        totalIntroSlideCount = parent.IntroSlidesCount,
        treeView = $("#treeView").data("kendoTreeView");
    if (currentIndex < totalIntroSlideCount) {
        treeView.expandPath(["Title"]);

    } else {
        selectTreeNodeDataItem = treeView.dataSource.get(currentIndex);
        selectTreeNode = treeView.findByUid(selectTreeNodeDataItem.uid);
        treeView.expandTo(currentIndex);
        treeView.select(selectTreeNode);
    }
}

function InitializeTreeViewCheckMark() {
    var stepIndex,
        stepInfo,
        chkViewed;
    for (stepIndex = parent.IntroSlidesCount; stepIndex < parent.TotalSlidesCount; stepIndex++) {
        stepInfo = parent.window["step" + stepIndex];
        if (!stepInfo) {
            continue;
        }
        chkViewed = $("#check-viewed" + stepIndex);
        if (stepInfo.Viewed) {
            chkViewed.show();
        } else {
            chkViewed.hide();
        }
    }
}

function FlattenData(rawDataList) {
    var i,
        currentRawData,
        outputData = [];
    for (i = 0; i < rawDataList.length; i++) {
        currentRawData = rawDataList[i];
        outputData.push(
                {
                    StepSectionNumber: currentRawData.StepSectionNumber,
                    StepIndex: currentRawData.StepIndex,
                    StepContent: currentRawData.StepContent,
                    StepType: currentRawData.StepType
                }
        );
        if (currentRawData.Children !== null) {
            $.merge(outputData, FlattenData(currentRawData.Children));
        }
    }
    return outputData;
}

function RefreshList() {
    var stepInfo,
        sectionNumber,
        isSection,
        isFirstRow,
        acknowledgeText,
        checked = $("input[name=list-filter]:checked").val(),
        $filteredList = $('#filtered-list'),
        $flatList = $('#flatList'),
        $allTreeView = $('#treeView');
    ShowHideFlatList();
    if (parent.State!='Normal' && checked == "Flat-List") {
        checked = "All";
    }
    switch (checked) {
        case "All":
            $filteredList.hide();
            $flatList.hide();
            $allTreeView.show();
            break;
        case "Flat-List":
            $filteredList.hide();
            $allTreeView.hide();
            $flatList.show();
            $flatList.empty();
            isFirstRow = true;
            if (FilteredListDataSummary) {
                for (var j = 0; j < FilteredListDataSummary.length; j++) {
                    var flatListData = FilteredListDataSummary[j];
                    stepInfo = parent.window["step" + flatListData.StepIndex];
                    if (stepInfo && parent.IsInteractiveStep(stepInfo.Type)) {
                        if (flatListData.StepSectionNumber.length > 0)
                            sectionNumber = flatListData.StepSectionNumber;
                        else {
                            sectionNumber = "*";
                        }
                        if (stepInfo.Acknowledged) {
                            acknowledgeText = stepInfo.AcknowledgedPersonName + " " + stepInfo.AcknowledgedDateTime;
                        } else {
                            acknowledgeText = "";
                        }
                        isSection = flatListData.StepType == "Default Section";
                        $flatList.append($('<tr></tr>', {
                            'class': isSection ? "section" : ""
                        })
                            .append($('<td></td>', {
                                text: sectionNumber,
                                onclick: "parent.window.CloseStepListAndNavigate(" + flatListData.StepIndex + ")",
                                'class': (isFirstRow ? "flat-list-first-row " : "") + "link "
                            }))
                            .append($('<td></td>', {
                                text: flatListData.StepContent,
                                onclick: "parent.window.CloseStepListAndNavigate(" + flatListData.StepIndex + ")",
                                'class': (isFirstRow ? "flat-list-first-row " : "") + "link "
                            }))
                            .append($('<td></td>', {
                                text: acknowledgeText,
                                onclick: "window.AcknowledgeFlatListStepClick(" + flatListData.StepIndex + ", " + !stepInfo.Acknowledged + ")",
                                'class': (isFirstRow ? "flat-list-first-row " : "") + "link acknowledgement "
                                    + (stepInfo.Acknowledged ? "acknowledged " : "")
                            })));
                        isFirstRow = false;
                    }
                }
            }
            break;
        case "Viewed":
        case "Not-Viewed":
        case "Flagged":
            $flatList.hide();
            $allTreeView.hide();
            $filteredList.show();
            $filteredList.empty();
            if (FilteredListDataSummary) {
                isFirstRow = true;
                $.each(FilteredListDataSummary, function (index, filteredListData) {
                    var bIncludeInList;
                    stepInfo = parent.window["step" + filteredListData.StepIndex];
                    if (stepInfo) {
                        switch (checked) {
                            case "Viewed":
                                bIncludeInList = stepInfo.Viewed;
                                break;
                            case "Not-Viewed":
                                bIncludeInList = !stepInfo.Viewed;
                                break;
                            case "Flagged":
                                bIncludeInList = stepInfo.Flagged;
                                break;
                        }
                        if (bIncludeInList) {
                            if (filteredListData.StepSectionNumber.length > 0)
                                sectionNumber = filteredListData.StepSectionNumber;
                            else {
                                sectionNumber = "*";
                            }
                            isSection = filteredListData.StepType == "Default Section";
                            $filteredList.append($('<tr></tr>', {
                                'class': isSection ? "section" : ""
                            })
                                .append($('<td></td>', {
                                    text: sectionNumber,
                                    onclick: "parent.window.CloseStepListAndNavigate(" + filteredListData.StepIndex + ")",
                                    "class": isFirstRow ? "first-row" : ""
                                })
                                    .append($('<input></input>', {
                                        val: filteredListData.StepIndex,
                                        type: "hidden",
                                        "class": "stepIndex"
                                    }))
                                )
                                .append($('<td></td>', {
                                    "class": isFirstRow ? "first-row" : ""
                                })
                                    .append($('<input></input>', {
                                        val: filteredListData.StepIndex,
                                        type: "hidden",
                                        "class": "stepIndex"
                                    }))
                                    .append($('<div></div>', {
                                        text: filteredListData.StepContent,
                                        id: "summary-content" + filteredListData.StepIndex,
                                        onclick: "parent.window.CloseStepListAndNavigate(" + filteredListData.StepIndex + ")"
                                    })))
                            );
                            isFirstRow = false;
                        }
                    }
                });
            }
            break;
        default:
            throw "Invalid View Selected!";
    }
}

function ShowHideFlatList() {
    $('#flat-list, #flat-list-label').hide(); //feature to be moved to main window
    if (parent.State != "Normal") {
        $('#flagged-list, #flagged-list-label').hide();
    } else {
        $('#flagged-list, #flagged-list-label').show();
    }
}

function AcknowledgeFlatListStepClick(stepIndex, ackStatus) {
    if (parent.State == 'Normal') {
        parent.window.SetStepAcknowledgeStatus(stepIndex, ackStatus);
    } else {
        alert('You can not make edits at this time.');//todo: specify reason better
    }
    RefreshList();
}