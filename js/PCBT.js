// Example header text. Can be configured in the options.
var AVERAGE_WPM = 200,
    CURRENT_USER_ID,
    B_IGNORE_EXTERNAL_CALL = false, //Used for debugging, true disables winforms call in interactive mode
    SESSION_TYPE,
    State = "Normal",
    ProcedureRoles,
    IsRefreshStepAcknowledgement,
    ReviewModeOn,
    UserRoles,
    vEventInstance = "",
    GTrainingID,
    msgScript = "",
    vMsgInputValue,
    bShowMOCBtn = true,
    VHeightContent = 100,
    ShowMessageGOTOStep = false,
    tblMainWidth = 0,
    tblMainHeight = 0,
    oWindowMOC,
    hasTable = false,
    isProperExit = false,
    HeightSettingCompleted = false,
    CurrentZoom = DEFAULT_ZOOM = 24,
    CurrentFontSize = 24,
    divStepHTMHeightWithAttachment,
    divStepHTMHeightWithoutAttachment,
    CurrentStepIndex = 0,
    CurrentQuestionIndexInStep = -1,
    VHeightContent,
    SPEECH_ACTIVEX_ERROR = "Member not found.\r\n",
    CurrentSectionID = 0,
    CompletionCriteriaLogic,
    CurrentSpeechContent = "",
    CompletionCriteriaEnum = {
        AckModStepAndAtt: { Id: "M", CheckAtt: true, StepTypeOfInterest: "Changed" },
        AckChngStep: { Id: "C", CheckAtt: false, StepTypeOfInterest: "Changed" },
        AckAllStepsAndAtt: { Id: "A", CheckAtt: true, StepTypeOfInterest: "All" },
        AckAllStepsNoAtt: { Id: "S", CheckAtt: false, StepTypeOfInterest: "All" },
        InteractiveMode: { Id: "I", CheckAtt: false, StepTypeOfInterest: "Interactive" }
    },
    AcknowledgeCriteriaEnum = {
        ManualAcknowledge: "M",
        AutoAdvanceOnAcknowledge: "A",
        AutoAcknowledgeOnNext: "N"
    },
    NotePairingModeEnum = {
        WithPreviousStep: "P",
        WithFollowingStep: "F"
    },
    SessionTypeEnum = {
        PerformanceEvaluation: "PerformanceEvaluation",
        Execution: "Execution",
        Both: "Both"
    };

$(document).ready(function () {
    $(window).resize(function () {
        ResizeWindow();
        ResizeAttachmentViewer();
        ResizePageDividers(CurrentQuestionIndexInStep);
    });
    LoadGlobalVariables();
    LoadUiControls();
    ResizeWindow();
    ResizePageDividers(CurrentQuestionIndexInStep);
    RenderReviewGrid();
    RenderProcUserFieldGrid();
    DisableSpeech(); // Disable speech for now until we find another more reliable ActiveX
    InitializeDocuments();
    LoadCompletionCriteriaLogic();
    LoadReviewModeControls();
    LoadInteractiveModeButtons();
    if (COMPLETION_CRITERIA == "I") {
        if (!B_IGNORE_EXTERNAL_CALL) {
            ChangeStateOfContent(window.external.GetContentState(), false);
        }
    }
    SetOptionsDisplay(null);
    GoToStepUsingStepIndex(0, -1);
    if (COMPLETION_CRITERIA === CompletionCriteriaEnum.InteractiveMode.Id && !B_IGNORE_EXTERNAL_CALL &&
        SESSION_TYPE != SessionTypeEnum.PerformanceEvaluation &&
        ProcedureRoles && ProcedureRoles.length > 0) {
        if (State == 'Normal' || State == 'Freeze') {
            var userRoleJson = UserRoles = GetRoles();
        }
        if (State == 'Normal' && (userRoleJson == null || userRoleJson.length == 0)) {
            OpenInitialRoleSelector();
        }
    }
});

function LoadGlobalVariables() {
    if (COMPLETION_CRITERIA == 'I' && !B_IGNORE_EXTERNAL_CALL) {
        CURRENT_USER_ID = window.external.GetCurrentUserId();
        SESSION_TYPE = window.external.GetSessionType();
        if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
            SyncStepInfoCompetenceFromOfflineDb();
        } else {
            SyncStepInfoAcknowledgementsFromOfflineDb();
        }
    }
}

function ChangeStateOfContent(state, bReloadPage) {
    if (COMPLETION_CRITERIA == 'I') {
        switch (state) {
            case "Normal":
                $('#userRoleSettings, #noteButton, #attButton, #divBtnExit, #aNextIncomplete, #aPrevIncomplete,' +
                    '#aNextFlag, #aPrevFlag, #syncSection').show();
                break;
            case "Freeze":
                $('#userRoleSettings, #divBtnExit, #aNextFlag, #aPrevFlag').hide();
                $('#noteButton, #attButton, #aNextIncomplete, #aPrevIncomplete, #syncSection').show();
                break;
            case "ReadOnly":
                $('#userRoleSettings, #noteButton, #attButton, #divBtnExit, #aNextIncomplete, #aPrevIncomplete,' +
                    '#aNextFlag, #aPrevFlag, #syncSection').hide();
                break;
            default:
                throw Error("Invalid state!");
        }
        State = state;
        if (bReloadPage) {
            GoToStepUsingStepIndex(CurrentStepIndex, -1);
        }
    } else {
        throw Error("Read only mode works only with Interactive Mode!");
    }
}

function DisableSpeech() {
    $('#trDisableSpeech, #trVolumeSlider, #trVolumeLabel').hide();
    $('#chkDisableSpeech').prop('checked', true);
}

function GetRoles() {
    var roles = null,
        rolesJsonStr = window.external.GetRoles();
    if (rolesJsonStr) {
        roles = JSON.parse(rolesJsonStr);
    }
    return roles;
}

function SyncStepInfoAcknowledgementsFromOfflineDb() {
    if (COMPLETION_CRITERIA == 'I' && !B_IGNORE_EXTERNAL_CALL) {
        if (State == 'Normal' || State == 'Freeze') {
            var latestAckList = eval(window.external.GetStepAcknowledgedList());
            for (var j = 0; j < latestAckList.length; j++) {
                var latestAckItem = latestAckList[j];
                var stepIndex = GetStepIndexFromStepMapping(latestAckItem.sID, latestAckItem.SharedProcIDRefNo, latestAckItem.SharedProcSID);
                var stepInfo = window["step" + stepIndex];
                if (stepInfo) {
                    stepInfo.Acknowledged = latestAckItem.data;
                    stepInfo.AcknowledgedDateTime = ConvertMsToDateTimeHourMin(parseInt(latestAckItem.eventDate.substr(6)));
                    stepInfo.AcknowledgedPersonName = latestAckItem.personName;
                }
            }
        }
    }
}

function ConvertMsToDateTimeHourMin(ms) {
    var date = new Date(ms);
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    if (min <= 9) {
        min = "0" + min;
    }
    var amPm = 'AM';
    if (hour >= 12) {
        amPm = 'PM';
        if (hour > 12) {
            hour -= 12;
        }
    }
    var formattedDateTimeString = month + '/' + day + '/' + year + ' ' +
        hour + ':' + min + ' ' + amPm;
    return formattedDateTimeString;
}

function SyncStepInfoCompetenceFromOfflineDb() {
    if (COMPLETION_CRITERIA == 'I' && !B_IGNORE_EXTERNAL_CALL) {
        if (State == 'Normal' || State == 'Freeze') {
            var latestCompetenceList = eval(window.external.GetStepCompetenceList());
            for (var j = 0; j < latestCompetenceList.length; j++) {
                var latestCompetenceItem = latestCompetenceList[j];
                var stepIndex = GetStepIndexFromStepMapping(latestCompetenceItem.sID, latestCompetenceItem.SharedProcIDRefNo, latestCompetenceItem.SharedProcSID);
                var stepInfo = window["step" + stepIndex];
                if (stepInfo) {
                    stepInfo.Competence = latestCompetenceItem.data;
                }
            }
        }
    }
}

function Sync() {
    if (!B_IGNORE_EXTERNAL_CALL) {
        window.external.SyncSessionAndEvents();
        UpdateSyncTime();
        GoToStepUsingStepIndex(CurrentStepIndex, -1);
    }
}

function UpdateSyncTime() {
    if (!B_IGNORE_EXTERNAL_CALL) {
        var lastSyncTime = window.external.GetLastSyncTime();
        $('#lastSyncTime').text(lastSyncTime);
    }
}

function LoadInteractiveModeButtons() {
    var interactiveModeButtons = $("#noteButton, #attButton, #userRoleSettings, #syncSection"),
        userRoleSettingsLink = $("#userRoleSettings"),
        nonInteractiveModeButtons = $("#imgRestartReading");
    if (COMPLETION_CRITERIA == CompletionCriteriaEnum.InteractiveMode.Id) {
        interactiveModeButtons.show();
        nonInteractiveModeButtons.hide();
        UpdateSyncTime();
        if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
            userRoleSettingsLink.hide();
        } else {
            userRoleSettingsLink.click(OpenRoleSelector);
        }
    } else {
        interactiveModeButtons.hide();
    }
}

function LoadReviewModeControls() {
    if (CompletionCriteriaLogic.StepTypeOfInterest === "Changed") {
        ToggleReviewMode(true);
        $(".reviewModeText").text("Change Review Mode");
        $(".reviewMode").show();
    } else {
        ToggleReviewMode(false);
        $(".reviewMode").hide();
    }
}

function ToggleReviewMode(reviewMode) {
    ReviewModeOn = reviewMode;
    var imageSrc;
    if (reviewMode === true) {
        imageSrc = "images/checkbox-on.png";
        $(".reviewMode").removeClass("red").removeClass("blue");
    } else {
        imageSrc = "images/checkbox-off.png";
        $(".reviewMode").removeClass("blue").addClass("red");
    }
    $(".imgReviewModeChkbx").attr("src", imageSrc);
}

function ReviewModeMouseDown(reviewModeCtrl) {
    reviewModeCtrl = $(reviewModeCtrl);
    reviewModeCtrl.removeClass("red").addClass("blue");
}

function LoadUiControls() {
    LoadSettingsMenuUi();
    LoadSignOffByContextMenu();
    LoadNavMenuUi($("#divMenuPrev"), $("#btnPreviousContext"));
    LoadNavMenuUi($("#divMenuNext"), $("#btnNextContext"));
    $("#ProcedureDetailstabstrip").kendoTabStrip({
        animation: {
            open: {
                effects: "fadeIn"
            }
        }
    });
    $(".kendoBtn").kendoButton({
    });
    $("#textSizeSlider").kendoSlider({
        change: SliderTextHandleClientValueChange,
        min: 10,
        max: 40,
        tickPlacement: "none",
        value: DEFAULT_ZOOM
    });
    $("#slideSpeedSlider").kendoSlider({
        min: 0,
        max: 3,
        value: 1,
        largeStep: 1,
        tickPlacement: "none",
        tooltip: {
            enabled: false
        }
    });
    $("#volumeSlider").kendoSlider({
        change: SliderVolumeHandleClientValueChange,
        min: 0,
        max: 100,
        tickPlacement: "none",
        value: Volume
    });
    $("#window").kendoWindow({
        actions: ["Close"],
        draggable: true,
        height: "450px",
        modal: true,
        resizable: false,
        width: "600px",
        iframe: true
    });
    $("#noteWindow").kendoWindow({
        actions: ["Refresh", "Close"],
        draggable: true,
        content: "NoteDialogue.html",
        height: "450px",
        modal: true,
        resizable: false,
        width: "600px",
        iframe: true
    });
    var noteWindow = $("#noteWindow").data("kendoWindow");
    var noteWindowRefreshIcon = noteWindow.wrapper.find(".k-i-refresh");
    noteWindowRefreshIcon.click(function (e) {
        Sync();
    });
    $("#noteMocWindow").kendoWindow({
        actions: ["Close"],
        draggable: true,
        content: "NoteMocDialogue.html",
        height: "450px",
        modal: true,
        resizable: false,
        width: "600px",
        iframe: true
    });
    var noteMocWindow = $("#noteMocWindow").data("kendoWindow");
    var noteMocWindowRefreshIcon = noteMocWindow.wrapper.find(".k-i-refresh");
    noteMocWindowRefreshIcon.click(function (e) {
        Sync();
    });
    $("#attWindow").kendoWindow({
        actions: ["Refresh", "Close"],
        content: "AttachmentDialogue.html",
        draggable: true,
        height: "450px",
        modal: true,
        resizable: false,
        width: "600px",
        iframe: true
    });
    var attWindow = $("#attWindow").data("kendoWindow");
    var attWindowRefreshIcon = attWindow.wrapper.find(".k-i-refresh");
    attWindowRefreshIcon.click(function (e) {
        Sync();
    });
    $("#evaluationSummaryWindow").kendoWindow({
        actions: ["Close"],
        draggable: true,
        height: "790x",
        modal: true,
        resizable: false,
        width: "850px",
        iframe: true
    });
    $("#stepEvaluationWindow").kendoWindow({
        actions: ["Close"],
        draggable: true,
        height: "280x",
        modal: true,
        resizable: false,
        width: "450px",
        iframe: true
    });
    $("#EquipmentLimitWindow").kendoWindow({
        actions: ["Close"],
        draggable: true,
        height: "650x",
        modal: true,
        resizable: false,
        width: "950px",
        iframe: true
    });
    $("#rolesWindow").kendoWindow({
        actions: ["Close"],
        draggable: true,
        height: "475px",
        modal: true,
        resizable: false,
        width: "700px",
        iframe: true
    });
}

function LoadSignOffByContextMenu() {
    if (COMPLETION_CRITERIA == "I" && !B_IGNORE_EXTERNAL_CALL) {
        var userListStr = window.external.GetAuthorizedUsers(),
            userList;
        if (userListStr) {
            userList = jQuery.parseJSON(userListStr);
            if (userList.length > 1) {
                for (var i = 0; i < userList.length; i++) {
                    var currentPerson = userList[i],
                        $contextMenu = $('#contextMenu');
                    if (currentPerson.personID != CURRENT_USER_ID) {
                        $contextMenu
                            .append($('<li></li>')
                                .append($('<a></a>',
                                    {
                                        text: currentPerson.fullEmpName,
                                    })
                                    .data('personid', currentPerson.personID)));
                    }
                }
            }
        }
        $("#imgInteractiveChkBx").contextMenu({
            menuSelector: "#contextMenu",
            menuSelected: function (invokedOn, selectedMenu) {
                AcknowledgeStepClick(selectedMenu.data('personid'));
            }
        });
    }
}

function LoadSettingsMenuUi() {
    $("#divSettings").hover(function () { }, function () {
        $(this).fadeOut(400);
    });
    //closes settings menu when clicking outside
    $(document).click(function () {
        $("#divSettings").fadeOut(400);
    });
    //prevents on click function from bubbling in to clicks on the settings Button (prevent close of settings menu)
    $("#settingsButton").click(function (e) {
        e.stopPropagation();
    });
    $("#divSettings").click(function (e) {
        e.stopPropagation();
    });
}

function LoadNavMenuUi($menu, $button) {
    $menu.hover(function () { }, function () {
        $(this).fadeOut(400);
    });
    //closes prev menu when clicking outside
    $(document).click(function () {
        $menu.fadeOut(400);
    });
    //prevents on click function from bubbling in to clicks on the settings Button (prevent close of settings menu)
    $button.click(function (e) {
        e.stopPropagation();
    });
    $menu.click(function (e) {
        e.stopPropagation();
    });
}

function ShowPrevContextMenu(event) {
    event.preventDefault();
}

function InitializeDocuments() {
    var docIndex, docId, i, stepWithDocuments;
    for (i = IntroSlidesCount; i < TotalSlidesCount; i++) {
        if (window["step" + i] != null) {
            stepWithDocuments = window["step" + i];
            if (stepWithDocuments.NumberOfStepDocuments > 0) {
                for (docIndex = 0; docIndex < stepWithDocuments.NumberOfStepDocuments; docIndex++) {
                    docId = stepWithDocuments.documents[docIndex].ID;
                    stepWithDocuments.documents[docIndex].FileName = DocFileName(docId);
                }
            }
        }
    }
    for (docIndex = 0; docIndex < ProcedureDocuments.length; docIndex++) {
        docId = ProcedureDocuments[docIndex].ID;
        ProcedureDocuments[docIndex].FileName = DocFileName(docId);
    }
}
function DocFileName(docId) {
    var docName = "";
    for (var i = 0; i < documents.length; i++) {
        if (documents[i][0] == docId) {
            docName = documents[i][1];
            break;
        }
    }
    return docName;
}

function ScormGetStudentName() {
    window.parent.GetStudentName();
}

function populateQuestionScore(pointsEarned, pointsPossible) {
    var stepInfo = window["step" + CurrentStepIndex],
        quesIndex = stepInfo.Questions[CurrentQuestionIndexInStep];
    QuesInfoSortedByIndex[quesIndex].PointsEarned = pointsEarned;
    QuesInfoSortedByIndex[quesIndex].PointsPossible = pointsPossible;
}

function LoadCompletionCriteriaLogic() {
    $.each(CompletionCriteriaEnum, function (i, criteria) {
        if (criteria.Id === COMPLETION_CRITERIA) {
            CompletionCriteriaLogic = criteria;
            return false;
        }
    });
}

function callInitButton() {
    try {
        if (HeightSettingCompleted) {
            document.all("btnInitialButton").click();
        } else {
            setTimeout(callInitButton(), 100);
        }
    } catch (exception) {
        alert(exception);
    }
};

function GoToStepUsingStepIndex(stepIndex, questionInStepIndex) {
    ClearTimeSpentOnCurrentSlide();
    $("video").each(function () {
        $(this).get(0).pause();
    });
    DisplayStep(stepIndex, questionInStepIndex);
    UpdateCurrentSpeechContent();
    var origIsAutoPlay = IsAutoPlay;
    StopAutoPlay();
    if (!$('#chkDisableSpeech').is(':checked')) {
        ReadCurrentContent();
    }
    if (origIsAutoPlay) {
        AutoPlay();
    }
};

function ClearTimeSpentOnCurrentSlide() {
    AutoPlayTimeOnSlideMs = 0;
}

function DisplayStep(stepIndex, questionInStepIndex) {
    if (questionInStepIndex === undefined || questionInStepIndex === null) {
        questionInStepIndex = -1;
    }
    CurrentStepIndex = stepIndex;
    CurrentQuestionIndexInStep = questionInStepIndex;
    $(".wcnRtnBtn").hide();
    var currentStep;
    ResizePageDividers(questionInStepIndex);
    if (typeof window['step' + CurrentStepIndex] !== "undefined") {
        currentStep = window["step" + CurrentStepIndex];
        SetAttachmentSectionDisplay(currentStep);
        SetStepAsViewedAndAcknowledged();
    }
    SetStepStatusBarDisplay(currentStep, CurrentSectionID);
    SetOptionsDisplay(currentStep);
    SetFlagBtnDisplay(currentStep);
    SetEvaluaitonBtnDisplay(currentStep);
    SetAcknowledgeBtnDisplay(currentStep);
    SetStatusBarStyle();
    DoZoom();
    var zoomId = "#divZoomStepHTML" + CurrentStepIndex;
    var stepContentHeight = $(zoomId).height();
    var imageHeight = VHeightContent - stepContentHeight;
    var img = $("#imgSingleAttachment" + CurrentStepIndex);
    if (img.length > 0) {
        ResizeSingleImage(imageHeight);
    }
    if (questionInStepIndex !== -1) {
        ResizeQuestionsIframe();
    }
}
function SetEvaluaitonBtnDisplay(currentStep) {
    if (currentStep == null) {
        $("#divBtnEve").hide();
    }
    else {
        $("#divBtnEve").show();
    }
}
function SetOptionsDisplay(currentStep) {
    if (State != "ReadOnly") {
        if (currentStep == null) {
            $("#divMarkerMenu").hide();
        } else {
            $("#divMarkerMenu").show();
        }
    }
}

function UpdateCurrentSpeechContent() {
    var textReadCtrl,
        textRead = "";
    if (CurrentQuestionIndexInStep === -1) {
        textReadCtrl = $("#divZoomStepHTML" + CurrentStepIndex);
        if (textReadCtrl && textReadCtrl.length) {
            textRead = textReadCtrl.text();
        }
    }
    CurrentSpeechContent = textRead;
}

function ResizeQuestionsIframe() {
    if (CurrentQuestionIndexInStep != -1) {
        var currentStep = window["step" + CurrentStepIndex];
        if (currentStep) {
            var quesIndex = currentStep.Questions[CurrentQuestionIndexInStep];
            window.frames["divMiddleContentFrameQ" + quesIndex].Initialize();
        }
    }
}

function ResizePageDividers(questionInStepIndex) {
    var stepVar,
        quesIndex,
        i,
        contentHeight;
    for (i = 0; i < TotalSlidesCount; i++) {
        $("#divCBTHeader" + i).css("display", "none");
        $("#divMiddleContent" + i).css("display", "none");
    }
    for (i = 0; i < QuesInfoSortedByIndex.length; i++) {
        $("#divMiddleContentQ" + i).css("display", "none");
    }
    $("#divCBTHeader" + CurrentStepIndex).css("display", "");
    contentHeight = window.innerHeight - ($("#divCBTHeader0").height() + $("#divFooter").height()) - 11;
    if (questionInStepIndex != -1) {
        stepVar = window["step" + CurrentStepIndex];
        quesIndex = stepVar.Questions[questionInStepIndex];
        $("#divMiddleContentQ" + quesIndex).css("display", "");
        $("#divMiddleContentFrameQ" + quesIndex).css("height", contentHeight - 10);
    } else {
        $("#divMiddleContent" + CurrentStepIndex).css("display", "");
        $("#divMiddleContent" + CurrentStepIndex).css("height", contentHeight);
    }
}
function SetAttachmentSectionDisplay(currentStep) {
    var bShow = false;
    if (currentStep) {
        if (currentStep.NumberOfStepDocuments > 0) {
            bShow = true;
        } else {
            //todo: add in logic here to not show attachment if it is a single displayable picture or video
        }
    }
    ShowHideAttachment(bShow);
}
function SetStepStatusBarDisplay(currentStep, previousIndex) {
    $("#divStepStatus" + previousIndex).css("display", "none");
    if (currentStep != null) {
        CurrentSectionID = currentStep.ParentSectionID;
    } else {
        CurrentSectionID = 0;
    }
    $("#divStepStatus" + CurrentSectionID).css("display", "");

}
function SetFlagBtnDisplay(currentStep) {
    if (currentStep != null) {
        if (COMPLETION_CRITERIA == 'I' &&
        (State == 'Freeze' || State == 'ReadOnly')) {
            $("#divFlag").hide();
        } else {
            if (currentStep.Flagged) {
                $("#btnFlag").attr("src", "images/button-flag-on.png");
            } else {
                $("#btnFlag").attr("src", "images/button-flag.png");
            }
            $("#divFlag").show();
            $("#divFlag").css("display", "inline-block");
        }
    } else {
        CurrentSectionID = 0;
        $("#divFlag").hide();
    }
}
function SetAcknowledgeBtnDisplay(currentStep) {
    if (ACKNOWLEDGE_CRITERIA != null && ACKNOWLEDGE_CRITERIA !== AcknowledgeCriteriaEnum.AutoAcknowledgeOnNext) {
        if (currentStep != null) {
            if (COMPLETION_CRITERIA == CompletionCriteriaEnum.InteractiveMode.Id) {
                if (State == 'ReadOnly') {
                    $("#imgInteractiveChkBx").hide();
                }
                else if (IsInteractiveStep(currentStep.Type)) {
                    $("#imgInteractiveChkBx").show();
                } else {
                    $("#imgInteractiveChkBx").hide();
                }
            } else {
                $("#divAcknowledge").css("display", "inline-block");
            }

            if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
                if (currentStep.Competence == 'yes') {
                    $("#imgInteractiveChkBx").attr("src", "images/icon-checkbox-checked.png");
                } else if (currentStep.Competence == 'no') {
                    $("#imgInteractiveChkBx").attr("src", "images/icon-evaluation-incompetent.png");
                } else {
                    $("#imgInteractiveChkBx").attr("src", "images/icon-checkbox-unchecked.png");
                }
            } else {
                if (currentStep.Acknowledged) {
                    $("#btnReviewed").attr("src", "images/check-acknowledged.png");
                    $("#imgInteractiveChkBx").attr("src", "images/icon-checkbox-checked.png");
                } else {
                    if (COMPLETION_CRITERIA == CompletionCriteriaEnum.InteractiveMode.Id) {
                        if (IsRoleSecurityCheck(UserRoles, currentStep.Roles)) {
                            $("#imgInteractiveChkBx").attr("src", "images/icon-checkbox-unchecked.png");
                        } else {
                            $("#imgInteractiveChkBx").attr("src", "images/icon-role-warning.png");
                        }
                    } else {
                        $("#btnReviewed").attr("src", "images/check-box.png");
                    }
                }
            }
        } else {
            $("#divAcknowledge").hide();
            $("#imgInteractiveChkBx").hide();
        }
    } else {
        $("#divAcknowledge").hide();
        $("#imgInteractiveChkBx").hide();
    }
}

function IsRoleSecurityCheck(userRoles, requiredRoles) {
    if (!requiredRoles || requiredRoles.length == 0 || DoListsIntersect(userRoles, requiredRoles)) {
        return true;
    }
    return false;
}

function DoListsIntersect(list1, list2) {
    if (list1 && list2) {
        for (var i = 0; i < list1.length; i++) {
            if ($.inArray(list1[i], list2) != -1) {
                return true;
            }
        }
    }
    return false;
}

function FlagStep() {
    var currentStep = window["step" + CurrentStepIndex];
    currentStep.Flagged = !currentStep.Flagged;
    DisplayStep(CurrentStepIndex, -1);
}

function AcknowledgeStepClick(otherPersonId) {
    var currentStep = window["step" + CurrentStepIndex];
    if (COMPLETION_CRITERIA == 'I' && State == 'Freeze') {
        alert('You can not make edits at this time.');//todo: expand to say what state they are in
    }
    else if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
        OpenKendoWindow("stepEvaluationWindow", "Evaluate Step", "StepEvaluation.html");
    }
    else if (COMPLETION_CRITERIA != "I" || IsRoleSecurityCheck(UserRoles, currentStep.Roles)) {
        SetStepAcknowledgeStatus(CurrentStepIndex, !currentStep.Acknowledged, otherPersonId);
        if (ACKNOWLEDGE_CRITERIA === AcknowledgeCriteriaEnum.AutoAdvanceOnAcknowledge &&
            currentStep.Acknowledged) {
            DoNext();
        } else {
            DisplayStep(CurrentStepIndex, -1);
        }
    } else {
        OpenForcedRoleSelector(currentStep.Roles);
    }
}
function SetStatusBarStyle() {
    var currentStepLayer, currentSectionStepLayer, className;
    //set all layers for section progress
    for (var stepIndex = 4; stepIndex < TotalSlidesCount; stepIndex++) {
        if (GetStepStatus("Flagged", stepIndex)) {
            className = 'clsStepStatusFlaggedCell';
        } else if (GetStepStatus("Acknowledged", stepIndex)) {
            className = 'clsStepStatusAcknowledgedCell';
        } else if (GetStepStatus("Viewed", stepIndex)) {
            className = 'clsStepStatusVisitedCell';
        } else {
            className = 'clsStepStatusCell';
        }
        currentStepLayer = $("#divStepStatusCell" + stepIndex);
        currentStepLayer.removeClass().addClass(className);
        if (className === 'clsStepStatusCell') {
            className = 'ClassNameSectionPreProcedure';
        }
        currentSectionStepLayer = $("#SectionStatusStep" + stepIndex);
        currentSectionStepLayer.removeClass().addClass(className);
    }
    //clear all layers for overall progress
    $('.CurrentSectionSeparator').removeClass().addClass('SectionSeparator');
    $('.clsSectionAcknowledgedStatusCurrentCell').removeClass();
    $('.clsSectionPartiallyVisitedStatusCurrentCell').removeClass().addClass('clsSectionPartiallyVisitedStatusCell'); //todo: class only needs to be added because the introduction slides are not integrated; fix this later
    //set layers for current step in overall progress
    var stepCssClass;
    if (GetStepStatus("Flagged", CurrentStepIndex)) {
        stepCssClass = 'clsStepStatusFlaggedCurrentCell';
    }
    else if (GetStepStatus("Acknowledged", CurrentStepIndex)) {
        stepCssClass = 'clsStepStatusAcknowledgedCurrentCell';
    } else {
        stepCssClass = 'clsStepStatusVisitedCurrentCell';
    }
    //unused available css class 'clsSectionPartiallyVisitedStatusCell'
    currentStepLayer = $("#divStepStatusCell" + CurrentStepIndex);
    currentStepLayer.removeClass().addClass(stepCssClass);
    $("#SectionStatus" + CurrentStepIndex).removeClass().addClass('CurrentSectionSeparator');
    //todo: it really doesn't matter if it is acknowledged or partially visited, clean up code later to just add a class for current cell and skip the isSectionAllViewed logic
    if (IsSectionAllViewed(CurrentSectionID)) {
        $("#SectionStepStatus" + CurrentSectionID).removeClass().addClass('clsSectionAcknowledgedStatusCurrentCell');
    } else {
        $("#SectionStepStatus" + CurrentSectionID).removeClass().addClass('clsSectionPartiallyVisitedStatusCurrentCell');
    }
}
function GetStepStatus(property, stepIndex) {
    var currentStep = window["step" + stepIndex];
    var propertyResult = null;
    if (currentStep != null)
        propertyResult = currentStep[property];
    return propertyResult;
}

function SetStepAsViewedAndAcknowledged() {
    var currentStep = window["step" + CurrentStepIndex];
    if (currentStep != null) {
        currentStep.Viewed = 'Y';
        if (ACKNOWLEDGE_CRITERIA === AcknowledgeCriteriaEnum.AutoAcknowledgeOnNext) {
            SetStepAcknowledgeStatus(CurrentStepIndex, true);
        }
    }
};

function SetStepAcknowledgeStatus(stepIndex, stepAckStatus, otherPersonId) {
    var stepOfInterest = window["step" + stepIndex];
    stepOfInterest.Acknowledged = stepAckStatus;
    stepOfInterest.AcknowledgedDateTime = ConvertMsToDateTimeHourMin(Date.now());
    if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
        stepOfInterest.Competence = stepAckStatus;
    }
    if (!B_IGNORE_EXTERNAL_CALL) {
        if (COMPLETION_CRITERIA == "I") {
            if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
                window.external.SaveComptence(stepAckStatus, stepOfInterest.StepID, stepOfInterest.SharedProcId, stepOfInterest.SharedStepId);
            } else {
                if (!otherPersonId) {
                    window.external.SaveStepAcknowledgement(stepOfInterest.Acknowledged,
                        stepOfInterest.StepID, stepOfInterest.SharedProcId, stepOfInterest.SharedStepId);
                    stepOfInterest.AcknowledgedPersonName = window.external.GetCurrentUserFullName;
                } else {
                    window.external.SaveStepAcknowledgementOnBehalf(stepOfInterest.Acknowledged,
                        stepOfInterest.StepID, stepOfInterest.SharedProcId, stepOfInterest.SharedStepId, otherPersonId);
                    stepOfInterest.AcknowledgedPersonName = window.external.GettUserFullName(otherPersonId);
                }
            }
        }
    }
}

function UpdateSectionProperty(sectionInfo, property) {
    var allAcknowledged = true;
    for (var i = 0; i < sectionInfo.StepIndices.length; i++) {
        var step = window["step" + sectionInfo.StepIndices[i]];
        if (!step[property]) {
            allAcknowledged = false;
            break;
        }
    }
    sectionInfo["All" + property] = allAcknowledged;
}

function GetSectionInfoFromSectionId(sectionId) {
    var section;
    for (var j = 0; j < Sections.length; j++) {
        if (Sections[j].SectionId == sectionId) {
            section = Sections[j];
            break;
        }
    }
    if (section) {
        return section;
    } else {
        throw new Error("Could not find section");
    }
};

function IsSectionAllViewed(sectionId) {
    var sectionInfo;
    if (sectionId > 0) {
        sectionInfo = GetSectionInfoFromSectionId(sectionId);
        UpdateSectionProperty(sectionInfo, "Viewed");
        return sectionInfo.AllViewed;
    } else {
        return false;
    }
};
function GetStepInfoFromStepMapping(stepId, sharedProcId, sharedStepId) {
    var stepIndex = GetStepIndexFromStepMapping(stepId, sharedProcId, sharedStepId);
    var stepInfo = window["step" + stepIndex];
    return stepInfo;
}
function GetStepIndexFromStepMapping(stepId, sharedProcId, sharedStepId) {
    for (var i = 0; i < StepMappingsSortedByIndex.length; i++) {
        var stepMapping = StepMappingsSortedByIndex[i];
        if (stepMapping.StepId == stepId) {
            if (CompareWithNull(sharedStepId, stepMapping.SharedStepId)
                && CompareWithNull(sharedProcId, stepMapping.SharedProcId)) {
                return i;
            }
        }
    }
    return -1;
};
function CompareWithNull(item1, item2) {
    if (item1 == item2) {
        return true;
    }
    if (!(item1 == null || item1 == '' || item1 == undefined)) {
        return false;
    }
    if (!(item2 == null || item2 == "" || item2 == undefined)) {
        return false;
    }
    return true;
}

function ResizeSingleImage(maxHeight) {
    var img = document.all("imgSingleAttachment" + CurrentStepIndex);
    var dimension = ResizeImage(img.src, 800, maxHeight);
    $("#imgSingleAttachment" + CurrentStepIndex).css("height", dimension[1]);
    //document.all("imgSingleAttachment").height = dimension[1];
    $("#imgSingleAttachment" + CurrentStepIndex).css("width", dimension[0]);
    //document.all("imgSingleAttachment").width = dimension[0];
    if (dimension[1] < maxHeight && dimension[0] < 800) {
        document.all("imgSingleAttachment" + CurrentStepIndex).removeAttribute("onClick");
        document.all("imgSingleAttachment" + CurrentStepIndex).style.cursor = "default";
    }
};
function ResizeImage(originalFile, newWidth, maxHeight) {
    var fullsizeImage = new Image();
    fullsizeImage.src = originalFile;
    return GetThumbNailImageSize(fullsizeImage.height, fullsizeImage.width, newWidth, maxHeight);
};
function GetThumbNailImageSize(actualHeight,
                               actualWidth,
                               lnWidth,
                               lnHeight) {
    var calculatedWidth = actualWidth;
    var calculatedHeight = actualHeight;
    var orWantedHeight = lnHeight;
    var orWantedWidth = lnWidth;

    try {
        var lnRatio;

        var lnNewWidth;
        var lnNewHeight;
        if (actualWidth < lnWidth &&
            actualHeight < lnHeight) {
            return [actualWidth, actualHeight];
        }
        var lnTemp;
        if (actualWidth > actualHeight) {
            lnRatio = lnWidth / actualWidth;
            lnNewWidth = lnWidth;
            lnTemp = actualHeight * lnRatio;
            lnNewHeight = lnTemp;
        } else {
            lnRatio = lnHeight / actualHeight;
            lnNewHeight = lnHeight;
            lnTemp = actualWidth * lnRatio;
            lnNewWidth = lnTemp;
        }
        if (lnNewHeight > orWantedHeight) {
            lnRatio = orWantedHeight / lnNewHeight;
            lnNewHeight = orWantedHeight;
            lnTemp = lnNewWidth * lnRatio;
            lnNewWidth = lnTemp;
        }
        if (lnNewWidth > orWantedWidth) {
            lnRatio = orWantedWidth / lnNewWidth;

            lnNewHeight = orWantedHeight;

            lnTemp = lnNewWidth * lnRatio;

            lnNewWidth = lnTemp;
        }

        calculatedWidth = lnNewWidth;
        calculatedHeight = lnNewHeight;
    } catch (excpetion) {
    }
    return [calculatedWidth, calculatedHeight];
};

function DoNext() {
    var origStepIndex = CurrentStepIndex,
        origQuestionIndex = CurrentQuestionIndexInStep,
        nextStep = GetNextStepIndex(CurrentStepIndex, CurrentQuestionIndexInStep, true);
    if (nextStep.exists &&
        (nextStep.stepIndex !== origStepIndex || nextStep.quesIndex !== origQuestionIndex)) {
        GoToStepUsingStepIndex(nextStep.stepIndex, nextStep.quesIndex);
    } else {
        StopAutoPlay();
        DisplayStep(origStepIndex, origQuestionIndex);
    }
}

function GetNextStepIndex(currentStepIndex, currentQuestionIndexInStep, bIncludeQuestions) {
    currentStepIndex = parseInt(currentStepIndex);
    currentQuestionIndexInStep = parseInt(currentQuestionIndexInStep);
    var stepInfo,
        nextStepInfo,
        nextStepIndex = currentStepIndex,
        nextQuestionIndexInStep = currentQuestionIndexInStep,
        exists = false;
    if (currentStepIndex < IntroSlidesCount) {
        nextStepIndex = currentStepIndex + 1;
        nextQuestionIndexInStep = -1;
        exists = true;
    } else {
        stepInfo = window["step" + currentStepIndex];
        if (stepInfo != null) {
            if (currentStepIndex < TotalSlidesCount) {
                if (bIncludeQuestions &&
                    stepInfo.Questions != null && stepInfo.Questions.length > 0 &&
                    currentQuestionIndexInStep + 1 < stepInfo.Questions.length) {
                    nextQuestionIndexInStep = currentQuestionIndexInStep + 1;
                    exists = true;
                } else if (window["step" + (currentStepIndex + 1)]) {
                    nextStepIndex = currentStepIndex + 1;
                    nextQuestionIndexInStep = -1;
                    exists = true;
                }
            }
        }
    }
    if (exists && ReviewModeOn && nextStepIndex >= IntroSlidesCount) {
        nextStepInfo = window["step" + nextStepIndex];
        if (CompletionCriteriaLogic.StepTypeOfInterest === "Changed" && !nextStepInfo.Changed) {
            return GetNextStepIndex(nextStepIndex, nextQuestionIndexInStep, bIncludeQuestions);
        }
    }
    return {
        stepIndex: nextStepIndex,
        quesIndex: nextQuestionIndexInStep,
        exists: exists
    }
}

function DoPrevious() {
    var origStepIndex = CurrentStepIndex,
        origQuestionIndex = CurrentQuestionIndexInStep,
        prevStep = GetPreviousStepIndex(CurrentStepIndex, CurrentQuestionIndexInStep, true);
    if (prevStep.stepIndex !== origStepIndex || prevStep.quesIndex !== origQuestionIndex) {
        GoToStepUsingStepIndex(prevStep.stepIndex, prevStep.quesIndex);
    }
};

function GetPreviousStepIndex(currentStepIndex, currentQuestionIndexInStep, bIncludeQuestions) {
    currentStepIndex = parseInt(currentStepIndex);
    currentQuestionIndexInStep = parseInt(currentQuestionIndexInStep);
    var stepInfo,
        prevStepInfo,
        prevStepIndex = currentStepIndex,
        prevQuestionIndexInStep = currentQuestionIndexInStep,
        exists = false;
    if (currentStepIndex > 0) {
        if (currentStepIndex <= IntroSlidesCount && currentQuestionIndexInStep == -1) {
            prevStepIndex = currentStepIndex - 1;
            prevQuestionIndexInStep = -1;
            exists = true;
        } else {
            if (bIncludeQuestions && currentQuestionIndexInStep >= 0) {
                prevQuestionIndexInStep = currentQuestionIndexInStep - 1;
                exists = true;
            } else {
                stepInfo = window["step" + (currentStepIndex - 1)];
                if (stepInfo != null) {
                    prevStepIndex = currentStepIndex - 1;
                    exists = true;
                    if (bIncludeQuestions && stepInfo.Questions != null && stepInfo.Questions.length > 0) {
                        prevQuestionIndexInStep = stepInfo.Questions.length - 1;
                    } else {
                        prevQuestionIndexInStep = -1;
                    }
                }
            }
            if (exists && ReviewModeOn) {
                prevStepInfo = window["step" + prevStepIndex];
                if (CompletionCriteriaLogic.StepTypeOfInterest === "Changed" && !prevStepInfo.Changed) {
                    return GetPreviousStepIndex(prevStepIndex, prevQuestionIndexInStep, bIncludeQuestions);
                }
            }
        }
    }
    return {
        stepIndex: prevStepIndex,
        quesIndex: prevQuestionIndexInStep,
        exists: exists
    }
}

function DoNextSection() {
    var nextSectionIndex = CurrentStepIndex;
    var currentParentId = -1;
    for (var i = CurrentStepIndex; i < TotalSlidesCount; i++) {
        if ((typeof window['step' + i]) !== "undefined") {
            var currentstep = window["step" + i];
            if (i == CurrentStepIndex) {
                currentParentId = currentstep.ParentSectionID;
            } else if (currentstep.ParentSectionID !== currentParentId) {
                nextSectionIndex = i;
                break;
            }
        }
    }
    GoToStepUsingStepIndex(nextSectionIndex, -1);
};

function DoPreviousSection() {
    var prevSectionIndex = CurrentStepIndex;
    var currentParentId = -1;
    var prevParentId = -1;
    for (var i = CurrentStepIndex; i > 0; i--) {
        if ((typeof window['step' + i]) != "undefined") {
            var currentstep = window["step" + i];
            if (i === CurrentStepIndex) {
                currentParentId = currentstep.ParentSectionID;
            } else if (currentstep.ParentSectionID !== currentParentId) {
                if (prevParentId === -1) {
                    prevParentId = currentstep.ParentSectionID;
                } else if (prevParentId !== currentstep.ParentSectionID) {
                    prevSectionIndex = i + 1;
                    break;
                }
            }
        } else {
            prevSectionIndex = i + 1;
            break;
        }
    }
    GoToStepUsingStepIndex(prevSectionIndex, -1);
};

function IsTrainingComplete() {
    var currentstep,
        i,
        incompleteQuestionInStepIndex;
    if (CompletionCriteriaLogic) {
        for (i = IntroSlidesCount; i < TotalSlidesCount; i++) {
            currentstep = window["step" + i] || null;
            if (currentstep) {
                if (IsStepIncomplete(currentstep)) {
                    return false;
                } else {
                    incompleteQuestionInStepIndex = GetIndexOfIncompleteQuestionInStep(currentstep);
                    if (incompleteQuestionInStepIndex != -1) {
                        return false;
                    }
                }
            }
        }
    } else {
        throw "Missing appropriate completion criteria.";
    }
    return true;
}

function DoNextIncompleteStep() {
    var currentstep,
        i,
        incompleteQuestionInStepIndex;
    if (CompletionCriteriaLogic) {
        for (i = CurrentStepIndex + 1; i < TotalSlidesCount; i++) {
            currentstep = window["step" + i] || null;
            if (currentstep) {
                if (IsStepIncomplete(currentstep)) {
                    GoToStepUsingStepIndex(i, -1);
                    break;
                } else {
                    incompleteQuestionInStepIndex = GetIndexOfIncompleteQuestionInStep(currentstep);
                    if (incompleteQuestionInStepIndex != -1) {
                        GoToStepUsingStepIndex(i, incompleteQuestionInStepIndex);
                        break;
                    }
                }
            }
        }
    }
}

function DoPreviousIncompleteStep() {
    var currentstep,
        i,
        incompleteQuestionInStepIndex;
    if (CompletionCriteriaLogic) {
        for (i = CurrentStepIndex - 1; i > 0; i--) {
            currentstep = window["step" + i] || null;
            if (currentstep) {
                if (IsStepIncomplete(currentstep)) {
                    GoToStepUsingStepIndex(i, -1);
                    break;
                } else {
                    incompleteQuestionInStepIndex = GetIndexOfIncompleteQuestionInStep(currentstep);
                    if (incompleteQuestionInStepIndex != -1) {
                        GoToStepUsingStepIndex(i, incompleteQuestionInStepIndex);
                        break;
                    }
                }
            }
        }
    }
}

function GetIndexOfIncompleteQuestionInStep(currentStepInfo) {
    var incompleteQuestion = -1;
    if (!currentStepInfo.Changed && CompletionCriteriaLogic.StepTypeOfInterest === "Changed" ||
        CompletionCriteriaLogic.StepTypeOfInterest === "Interactive") {
        return -1;
    }
    if (currentStepInfo.Questions) {
        $.each(currentStepInfo.Questions, function (index, value) {
            if (QuesInfoSortedByIndex[value].Score === null) {
                incompleteQuestion = index;
                return false;
            }
        });
    }
    return incompleteQuestion;
}

function IsStepIncomplete(currentStep) {
    if (CompletionCriteriaLogic.StepTypeOfInterest === "Changed" && !currentStep.Changed) {
        return false;
    }
    if (CompletionCriteriaLogic.StepTypeOfInterest === "Interactive" && !IsInteractiveStep(currentStep.Type)) {
        return false;
    }
    if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
        if ((currentStep.Competence != 'yes' && currentStep.Competence != 'no') ||
        (CompletionCriteriaLogic.CheckAtt && !IsAllDocumentComplete(currentStep))) {
            return true;
        }
    } else {
        if (currentStep.Acknowledged != true ||
        (CompletionCriteriaLogic.CheckAtt && !IsAllDocumentComplete(currentStep))) {
            return true;
        }
    }
    return false;
}

function IsAllDocumentComplete(currentstep) {
    //TODO: have to add in logic for single attachments; likely elsewhere to mark document as viewed
    var allAttViewed = true;
    if (currentstep.NumberOfStepDocuments > 0) {
        $.each(currentstep.documents, function (i, value) {
            if (value.Viewed !== 'Y') {
                allAttViewed = false;
                return false;
            }
        });
    }
    return allAttViewed;
}

function DoFirstStep() {
    GoToStepUsingStepIndex(0, -1);
}

function DoLastStep() {
    GoToStepUsingStepIndex(TotalSlidesCount - 1, -1);
}

function DoNextFlag() {
    var nextFlaggedStep = CurrentStepIndex;
    for (var i = CurrentStepIndex + 1; i < TotalSlidesCount; i++) {
        if ((typeof window['step' + i]) !== "undefined") {
            var currentstep = window["step" + i];
            if (currentstep.Flagged) {
                nextFlaggedStep = i;
                break;
            }
        }
    }
    GoToStepUsingStepIndex(nextFlaggedStep, -1);
}

function DoPreviousFlag() {
    var prevFlaggedStep = CurrentStepIndex;
    for (var i = CurrentStepIndex - 1; i >= 0; i--) {
        if ((typeof window['step' + i]) !== "undefined") {
            var currentstep = window["step" + i];
            if (currentstep.Flagged) {
                prevFlaggedStep = i;
                break;
            }
        }
    }
    GoToStepUsingStepIndex(prevFlaggedStep, -1);
}

function showGlossary(obj, glossaryterm, description) {
    description = "<div style='padding-bottom:5px;padding-top:10px;padding-left:5px;padding-right:10px ;font-size:16px; font-family:Tahoma;color:Blue;font-weight:bold'>" + description + "</div>";
    var tooltip = $find("RadToolTipGlossary");
    tooltip.set_text(description);
    tooltip.set_targetControlID("");
    tooltip.set_targetControlID(obj.id);
    window.setTimeout(function () {
        tooltip.show();
    }, 1);
    //msgScripts = "('" + description + "','OK','Glossary','Information',false,'Something','ERROR')";
    //eval(msgScript + msgScripts);
};

function hideGlossary() {
    var tooltip = $find("RadToolTipGlossary");
    tooltip.hide();
    RadToolTipGlossaryHide(tooltip, null);
};

function RadToolTipGlossaryHide(sender, eventArgs) {
    sender.set_targetControlID("");
};

function ShowMessageNotComplete(message) {
    msgScripts = "('" + message + "','YESNO','Go To Last Step','Question',false,'Something','NOTCOMPLETE')";
    eval(msgScript + msgScripts);
};

function ShowMessageGOTOChanged(message) {
    msgScripts = "('" + message + "','OK','No Step Found','Information',false,'Something','NOSTEPFOUND')";
    eval(msgScript + msgScripts);
};

function ShowMessageExit(message) {
    //	alert("T");
    msgScripts = "('" + message + "','YESNO','Confirm','Question',false,'Something','EXITPROCEDURE')";
    eval(msgScript + msgScripts);
};

function ShowMessageChangeRequest(message) {
    msgScripts = "('" + message + "','YESNO','Confirm','Question',false,'Something','SUBMITCHANGEREQUEST')";
    eval(msgScript + msgScripts);
};

function ShowMessageExitAndSubmitChangeRequest(message) {
    msgScripts = "('" + message + "','YESNO','Confirm','Question',false,'Something','EXITPROCEDURESUBMITCHANGEREQUEST')";
    eval(msgScript + msgScripts);
};

function MsgCancelClicked() {
    var Instance = eval(vEventInstance);
    switch (Instance) {
        case "GETINITSTEP":
            document.all("btnInit").click();
            break;
        case "EXITPROCEDURE":
            isProperExit = true;
            document.all("btnExitProcDelete").click();
            break;
        case "SUBMITCHANGEREQUEST":
            ShowMessageExit("Do you want to save this session?");
            break;
        case "EXITPROCEDURESUBMITCHANGEREQUEST":
            GoToChangeRequest("N");
            break;
    }
};

function MsgOkClicked() {
    var Instance = eval(vEventInstance);
    switch (Instance) {
        case "NOTCOMPLETE":
            //GoToChangeRequest();
            parent.window.close();
            break;
        case "GETINITSTEP":
            document.all("hiddenCurrentStepIDX").value = "0";
            document.all("btnStepChanger").click();
            break;
        case "GETMOCCOMMENT":
            var MocComment = eval(vMsgInputValue);
            document.all("hiddenMOCComment").value = MocComment;
            document.all("btnMOCUpdate").click();
            break;
        case "EXITPROCEDURE":
            document.all("btnExitProcSave").click();

            break;
        case "STARTERROR":
            parent.window.close();
            break;
        case "SUBMITCHANGEREQUEST":
            ShowMessageExitAndSubmitChangeRequest("Do you want to save this session?");
            break;
        case "EXITPROCEDURESUBMITCHANGEREQUEST":
            GoToChangeRequest("Y");
            break;
    }
};

function ClosePrint() {
    oWindowPD.close();
};

function doPrint(IDREF) {
    URL = '../../ProcView/Procedure.aspx?IDRefNo=' + IDREF + '&ToPrint=Y';
    window.open(URL);
};

function ShowSettings(obj) {
    var pos = findPos(obj);
    $('#divSettings').slideToggle();
    document.all("divSettings").style.bottom = 3 + "px";
    document.all("divSettings").style.left = pos[0] + "px";
};

function ShowMenuNext(obj) {
    var pos = findPos(obj);
    $('#divMenuNext').slideToggle();
    document.all("divMenuNext").style.bottom = 3 + "px";
    document.all("divMenuNext").style.left = pos[0] - document.all("divMenuNext").offsetWidth +
        document.all("btnNextContext").offsetWidth + "px";
};

function ShowMenuPrev(obj) {
    var pos = findPos(obj);
    $('#divMenuPrev').slideToggle();
    document.all("divMenuPrev").style.bottom = 3 + "px";
    document.all("divMenuPrev").style.left = pos[0] - document.all("divMenuPrev").offsetWidth +
        document.all("btnPreviousContext").offsetWidth + "px";
};

function findPos(obj) {
    var curtop = 0;
    var curleft = 0;
    if (obj.offsetParent) {
        curleft = obj.offsetLeft;
        curtop = obj.offsetTop;
        while (obj = obj.offsetParent) {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        }
    }
    return [curleft, curtop];
};

var hasSideBar = false;

function BlinkWCN(objID) {
    hasSideBar = true;
    obj = document.getElementById(objID);
    if (obj != null) {
        if (obj.style.visibility == '') {
            obj.style.visibility = 'hidden';
        } else {
            obj.style.visibility = '';
        }
        setTimeout(function () {
            BlinkWCN(objID);
        }, 1000);
    }
};

function EndCBT() {
    oWindowCR.close();
    var mClose = document.all("hiddenClose").value;
    var url = document.all("hiddenEndURL").value;
    if (mClose == "Y") {
        parent.window.close();
    } else {
        location.href = url;
    }
};

function CloseChangeRequest() {
    oWindowCR.close();
};

function GoToChangeRequest() {
    GoToChangeRequest("N");
};

function GoToChangeRequest(mDelete) {
    height = document.body.offsetHeight;
    heightForWindow = height - 25;
    var mClose = document.all("hiddenClose").value;
    var num = Math.random();
    URL = "ChangeRequest.aspx?InstanceID=" + GInstanceID + "&TrainingID=" + GTrainingID + "&r=" + num + "&Close=" + mClose + "&Delete=" + mDelete;
    var manager = GetRadWindowManager();
    oWindowCR = manager.GetWindowByName("WindowWithoutTitleBar");
    oWindowCR.setUrl(URL);
    oWindowCR.SetSize(document.body.offsetWidth + 22, heightForWindow);
    oWindowCR.show();
    oWindowCR.set_title("Change Request");
    oWindowCR.moveTo(-10, -10);
};

var GInstanceID;
//var CurrentFontSize = 12;
var Volume = 75;
var oWindowM;
var FontSizeSet = false;

function ShowStepToolTipJOb() {
};

function ShowStepToolTip() {
};

function CloseProcedureDetails() {
    oWindowPD.close();
};

var oWindowPD;

function ShowProcedureDetails(InstanceID, ShowAttachment, Type) {
    //todo: Show Procedure Details logic
    //var num = Math.random();
    //height = document.all("trMainContent").offsetHeight;
    //heightForWindow = height - 100;
    //URL = "PropertiesTab.aspx?InstanceID=" + InstanceID + "&Type=" + Type + "&TrainingID=" + GTrainingID + "&ShowAttachment=" + ShowAttachment + "&r=" + num + "&height=" + heightForWindow;
    //var manager = GetRadWindowManager();
    //oWindowPD = manager.GetWindowByName("ModalWindowWithoutTitleBar");
    //oWindowPD.setUrl(URL);
    //oWindowPD.show();
    //oWindowPD.set_title("Procedure Details");
    //var top = document.all("trMainContent").offsetTop;
    //oWindowPD.SetSize(tblMainWidth, height);
    //oWindowPD.moveTo(0, top);
    //StopReading();
};

function showMoc(val) {
    bShowMOCBtn = true;
    val = "true";
    if (val.toUpperCase() == "TRUE") {
        bShowMOCBtn = true;
        document.all("btnMOC").style.visibility = '';
    } else {
        bShowMOCBtn = false;
        document.all("btnMOC").style.visibility = 'hidden';
    }
};

function doInfoClick(obj) {
    //todo: fix logic
    //var num = Math.random();
    //height = document.all("trMainContent").offsetHeight;
    //var equipHeight = height - 100;
    //var equipWidth = tblMainWidth - 50;
    //URL = "PropertiesTab.aspx?InstanceID=" + GInstanceID + "&StepID=" + document.all("hiddenCurrentStepIDX").value + "&Type=S&height=" + equipHeight + "&width=" + equipWidth + "&r=" + num;

    //heightForWindow = height - 100;
    //var manager = GetRadWindowManager();
    //oWindowPD = manager.GetWindowByName("ModalWindowWithoutTitleBar");
    //oWindowPD.setUrl(URL);
    //oWindowPD.show();
    //oWindowPD.set_title("Procedure Details");
    //var top = document.all("trMainContent").offsetTop;
    //oWindowPD.SetSize(tblMainWidth, height);
    //oWindowPD.moveTo(0, top);
    //StopReading();
};

function doContextMenubtnPrevious(obj) {
    var top = obj.offsetTop;
    var left = obj.offsetLeft + 20;
    document.all("divPreviousRightClick").style.top = top + "px";
    document.all("divPreviousRightClick").style.left = left + "px";
    document.all("divPreviousRightClick").style.display = 'none';
    return false;
};

function GetMOComment() {
    var w = 480, h = 340;

    w = document.body.offsetWidth;
    h = document.body.offsetHeight;

    var popW = 440, popH = 280; //change this to match your RadWindow Width and Height

    var leftPos = (w - popW) / 2;
    var topPos = (h - popH) / 2;

    var num = Math.random();
    URL = "Comments.aspx?InstanceID=" + GInstanceID + "&TrainingID=" + GTrainingID + "&r=" + num;
    var manager = GetRadWindowManager();
    oWindowMOC = manager.GetWindowByName("ModalWindowWithoutTitleBar");
    oWindowMOC.setUrl(URL);
    oWindowMOC.show();
    oWindowMOC.SetSize(popW, popH);
    oWindowMOC.MoveTo(leftPos, topPos);
    StopReading();
};

function CloseMOComment(exist) {
    oWindowMOC.close();
    if (exist.toUpperCase() == "TRUE") {
        document.all("btnMOC").src = "images/button-moc-on.png";
    }
};

function ReadCurrentContent() {
    Speak(CurrentSpeechContent);
}

function Speak(speechContent) {
    try {
        document.all("SpeechControl").Speak(speechContent, Volume);
    } catch (e) {
        if (e.message === SPEECH_ACTIVEX_ERROR) {
            HandleActiveXSecuritySpeechControlError();
        } else {
            throw e;
        }
    }
};

function HandleActiveXSecuritySpeechControlError() {
    var disableSpeechChkbx = $("#chkDisableSpeech");
    if (!disableSpeechChkbx.prop("checked")) {
        disableSpeechChkbx.prop("checked", true);
        chkDisableSpeechChanged(disableSpeechChkbx);
        alert("Speech has been disabled. Please enable ActiveX to enable speech.");
    }
}

//disable reading until alternative to ActiveX control is found
function StopReading() {
    //try {
    //    document.all("SpeechControl").StopReading();
    //} catch (e) {
    //    if (e.message === SPEECH_ACTIVEX_ERROR) {
    //        HandleActiveXSecuritySpeechControlError();
    //    } else {
    //        throw e;
    //    }
    //}
};

function BtnReplayClick() {
    StopReading();
    Speak(CurrentSpeechContent);
}

function IsSpeechComplete() {
    try {
        var speechStatus = document.all("SpeechControl").Getstatus();
    } catch (e) {
        if (e.message == SPEECH_ACTIVEX_ERROR) {
            HandleActiveXSecuritySpeechControlError();
            return true;
        } else {
            throw e;
        }
    }
    if (speechStatus == 1) {
        return true;
    }
    return false;
};

function SliderVolumeHandleClientValueChange(sender) {
    try {
        Volume = sender.value;
        var speechControl = document.all("SpeechControl");
        if (speechControl.GetStatus() !== "NA") {
            speechControl.ChangeVolume(Volume);
        }
    } catch (e) {
        if (e.message == SPEECH_ACTIVEX_ERROR) {
            HandleActiveXSecuritySpeechControlError();
        } else {
            throw e;
        }
    }
};

function ShowAttachmentFile(strUrl, strUncPath, attachmentId) {
    var num = Math.random();
    document.all("ifrDownload").src = 'downloadfile.aspx?URL=' + strUrl + '&UNC=' + strUncPath + "&r=" + num;
    LogAttachmentViewed(attachmentId);
};

function ShowAttachmentFromStep(attachmentId) {
    ShowAttachment(attachmentId);
    SetAttachmentStyle(attachmentId, CurrentStepIndex);
};

function SetAttachmentStyle(attachmentId, stepIndex) {
    if (stepIndex < IntroSlidesCount) {
        $('#spanViewed' + attachmentId).text("Yes");
    } else {
        $("#tcMainAttachment" + attachmentId + stepIndex).removeClass("tcMainAttachmentClass");
        $("#tblAttachment" + attachmentId + stepIndex).removeClass("tblAttachmentClass");
        $("#tcAttImage" + attachmentId + stepIndex).removeClass("StyleClassForImageAtt");
        $("#SpanAttachmentName" + attachmentId + stepIndex).removeClass("SpanAttachmentNameClass");
        $("#tcMainAttachment" + attachmentId + stepIndex).addClass("tcMainAttachmentClassViewed");
        $("#tblAttachment" + attachmentId + stepIndex).addClass("tblAttachmentClassViewed");
        $("#tcAttImage" + attachmentId + stepIndex).addClass("StyleClassForImageAttViewed");
        $("#SpanAttachmentName" + attachmentId + stepIndex).addClass("SpanAttachmentNameClassViewed");
        $("#ImgViewed" + attachmentId + stepIndex).css("visibility", "visible");
    }
};

function getCurrentStepAttachment(attachmentId) {
    var attachment,
        i;
    if (CurrentStepIndex == 1) {
        for (i = 0; i < ProcedureDocuments.length; i++) {
            if (ProcedureDocuments[i].ID == attachmentId) {
                attachment = ProcedureDocuments[i];
                break;
            }
        }
    } else {
        var currentStep = eval("step" + CurrentStepIndex);
        for (i = 0; i < currentStep.documents.length; i++) {
            if (currentStep.documents[i].ID == attachmentId) {
                attachment = currentStep.documents[i];
                break;
            }
        }
    }
    return attachment;
}


function getContentHeight() {
    var height = document.all("cbtStepContentS").offsetHeight;
    return height;
};

function ShowEffectiveChange() {
    StopReading();

    var height = document.all("cbtStepContentS").offsetHeight;
    height = VHeightContent + 200;
    var theight = height - 157;

    //var height = document.all("cbtStepContentS").offsetHeight;
    //	height = VHeightContent + 120;
    //	var theight = height - 90;
    var num = Math.random();
    URL = "EffectiveChanges.aspx?InstanceID=" + GInstanceID + "&height=" + theight + "&rand=" + num;
    var manager = GetRadWindowManager();
    oWindowM = manager.GetWindowByName("WindowWithoutTitleBar");
    oWindowM.setUrl(URL);

    oWindowM.SetSize(tblMainWidth, height);
    oWindowM.show();
    var top = document.all("trMainContent").offsetTop;
    oWindowM.moveTo(-10, -10);
};

var hasAttachment = false;

function ShowHideAttachment(bShow) {
    var attachmentSection = $('.MainTableAttachmentClass');
    if (attachmentSection) {
        if (bShow) {
            hasAttachment = true;
            attachmentSection.css('display', '');
            //todo: need to implement logic for attachment scroller
            //var wrapperDiv = document.getElementById('Attachment_wrapper');
            //var contentDiv = document.getElementById('Attachment_content');
            //if (contentDiv.scrollWidth > wrapperDiv.offsetWidth) {
            //    document.all('divAttachmentSlider').style.visibility = '';
            //} else {
            //    document.all('divAttachmentSlider').style.visibility = 'hidden';
            //}
            try {
                WCNSetUP();
            } catch (e) {
            }
        } else {
            hasAttachment = false;
            attachmentSection.css('display', 'none');
        }
    }
};

function DoMouseOver(obj, url) {
    obj.src = url;
};

function DoMouseOut(obj, url) {
    obj.src = url;
};

function playBtnDoMouseOver(playBtn) {
    if (IsAutoPlay) {
        playBtn.src = "images/pause-on.png";
    } else {
        playBtn.src = "images/button-play-on.png";
    }
}

function playBtnDoMouseOut(playBtn) {
    if (IsAutoPlay) {
        playBtn.src = "images/pause.png";
    } else {
        playBtn.src = "images/button-play.png";
    }
}

function OpenProcedureDetails() {
    //todo: fix procedure data link
    //ShowProcedureDetails(GInstanceID, false, 'P');
};

function doProcAttachmentClick() {
};

function HideEffectiveChange() {
    oWindowM.Close();
};

var SliderClientID;
var objSliderProgress;
var sliderMaxVal;

function clientLoaded(sender, eventArgs) {
    //objSliderProgress = sender;
};

function ShowSharedProcAttachment(url) {
    window.open(url);
    return false;
};

function DoZoom() {
    var objectsToZoom = document.all("divZoomStepHTML" + CurrentStepIndex);
    if (objectsToZoom != null && objectsToZoom.style != null) {
        objectsToZoom.style.fontSize = CurrentZoom + "pt";
    }
};

function SliderSlideIntervalHandleClientValueChange(sender, eventArgs) {
    var speed = sender.get_value();
};

function SliderTextHandleClientValueChange(sender, eventArgs) {
    CurrentZoom = sender.value;
    DoZoom();
};

function AdjustPadding(HasTable) {
    hasTable = HasTable;
};

/*
function showVolumeSlider(obj)
{
var pos = findPos(obj);
var objSliderDiv = document.all("divSliderVolume");
objSliderDiv.style.display = '';
objSliderDiv.style.position = 'absolute';
objSliderDiv.style.left = pos[0] - 40;
objSliderDiv.style.top = pos[1] - 40;
}
function hideVolumeSlider()
{

switch (event.srcElement.id)
{
case "RadSliderWrapper_RadSliderVolume":
case "RadSliderTrack_RadSliderVolume":
case "RadSliderSelected_RadSliderVolume":
case "btnSpeechControl":
case "btnPlaySpeed":
return;
break;
default:
var objSliderDiv = document.all("divSliderVolume");
objSliderDiv.style.display = 'none';
}
}
function hidePlaySpeedSlider()
{

switch (event.srcElement.id)
{
case "RadSliderWrapper_radSliderSlideSpeed":
case "RadSliderTrack_radSliderSlideSpeed":
case "RadSliderSelected_radSliderSlideSpeed":
case "btnSpeechControl":
case "btnFontSize":
case "btnPlaySpeed":
return;
break;
default:
var objSliderDiv = document.all("divPlaySpeed");
objSliderDiv.style.display = 'none';
}
}
function hideSliders()
{
hideTextSlider();
hideVolumeSlider();
hidePlaySpeedSlider();
}

function showTextSlider(obj)
{
var pos = findPos(obj);
var objSliderDiv = document.all("divSliderText");
objSliderDiv.style.display = '';
objSliderDiv.style.position = 'absolute';
objSliderDiv.style.left = pos[0] - 40;
objSliderDiv.style.top = pos[1] - 40;

}
function hideTextSlider()
{
switch (event.srcElement.id)
{
case "RadSliderSelected_RadSliderText":
case "RadSliderWrapper_RadSliderText":
case "RadSliderTrack_RadSliderText":
case "btnFontSize":
case "btnPlaySpeed":
return;
break;

default:
var objSliderDiv = document.all("divSliderText");
objSliderDiv.style.display = 'none';
}
}*/
var initialValue2;

function SliderAttachmentHandleClientValueChange(sender, eventArgs) {
    var wrapperDiv = document.getElementById('Attachment_wrapper');
    var contentDiv = document.getElementById('Attachment_content');
    var oldValue = (eventArgs) ? eventArgs.get_oldValue() : sender.get_minimumValue();
    var change = sender.get_value() - oldValue;
    var contentDivWidth = contentDiv.scrollWidth - wrapperDiv.offsetWidth;
    var calculatedChangeStep = contentDivWidth / ((sender.get_maximumValue() - sender.get_minimumValue()) / sender.get_value());
    initialValue2 = initialValue2 - change * calculatedChangeStep;
    if (sender.get_value() == sender.get_minimumValue()) {
        contentDiv.style.left = 0 + 'px';
        initialValue2 = sender.get_minimumValue();
    } else {
        contentDiv.style.left = initialValue2 + 'px';
    }
};

function SliderAttachmentHandleClientLoaded(sender, eventArgs) {
    initialValue2 = sender.get_minimumValue();
    SliderAttachmentHandleClientValueChange(sender, null);
};

function alertSize() {
    var myWidth = 0, myHeight = 0;
    if (typeof (window.innerWidth) == 'number') {
        //Non-IE
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
    } else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
        //IE 6+ in 'standards compliant mode'
        myWidth = document.documentElement.clientWidth;
        myHeight = document.documentElement.clientHeight;
    } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        //IE 4 compatible
        myWidth = document.body.clientWidth;
        myHeight = document.body.clientHeight;
    }
};
var InBetweenSlideWaitTimerId, RecursivePlayTimerId;
var IsAutoPlay = false;
function btnPlayClick(btnPlay) {
    if (IsAutoPlay) {
        btnPlay.src = "images/button-play-on.png";
        StopAutoPlay();
    } else {
        btnPlay.src = "images/pause-on.png";
        DoNext();
        AutoPlay();
    }
};

//disable reading until alternative to ActiveX control is found
function StopAutoPlay() {
    IsAutoPlay = false;
    StopReading();
    if (RecursivePlayTimerId) {
        clearTimeout(RecursivePlayTimerId);
    }
    if (InBetweenSlideWaitTimerId) {
        clearTimeout(InBetweenSlideWaitTimerId);
    }
}

var AutoPlayTimeOnSlideMs = 0;
var AUTOPLAY_MIN_MS_ON_SLIDE = 3000; //At Normal Speed (Speed Slider Value 1)
var AUTOPLAY_MS_BETWEEN_SLIDE_W_DIALOG = 1000;

function AutoPlay() {
    var waitTimeMs,
        speedFactor;
    IsAutoPlay = true;
    if ($("#chkDisableSpeech").prop("checked")) {
        speedFactor = GetSpeedFactor();
        waitTimeMs = GetSilentReadTime(speedFactor);
        //console.log(waitTimeMs + " " + CurrentStepIndex + " Initial");
        if (waitTimeMs < AUTOPLAY_MIN_MS_ON_SLIDE) {
            waitTimeMs = AUTOPLAY_MIN_MS_ON_SLIDE;
        }
        //if (InBetweenSlideWaitTimerId) {
        //    clearTimeout(InBetweenSlideWaitTimerId);
        //}
        InBetweenSlideWaitTimerId = setTimeout(function () { DoNext(); }, waitTimeMs);
        //console.log(waitTimeMs + " " + CurrentStepIndex);
    } else {
        var speakingDone = IsSpeechComplete();
        //console.log("speaking done: " + speakingDone);
        if (speakingDone && AutoPlayTimeOnSlideMs >= AUTOPLAY_MIN_MS_ON_SLIDE - AUTOPLAY_MS_BETWEEN_SLIDE_W_DIALOG) {
            //console.log(AUTOPLAY_MS_BETWEEN_SLIDE_W_DIALOG+" " + CurrentStepIndex + " " + CurrentQuestionIndexInStep);
            InBetweenSlideWaitTimerId = setTimeout(function () { DoNext(); }, AUTOPLAY_MS_BETWEEN_SLIDE_W_DIALOG);
        } else {
            AutoPlayTimeOnSlideMs += 500;
            //console.log("500 " + CurrentStepIndex + " " + CurrentQuestionIndexInStep + " " + AutoPlayTimeOnSlideMs/1000);
            RecursivePlayTimerId = setTimeout(function () { AutoPlay(); }, 500);
        }
    }
};

function GetSpeedFactor() {
    var speedFactor,
        speedSliderValue = $("#slideSpeedSlider").data("kendoSlider").value();
    switch (speedSliderValue) {
        case 0:
            speedFactor = 1.25;
            break;
        case 1:
            speedFactor = 1;
            break;
        case 2:
            speedFactor = .75;
            break;
        case 3:
            speedFactor = .5;
            break;
        default:
            throw "Invalid Speed Setting!";
    }
    return speedFactor;
}

function GetSilentReadTime(speedFactor) {
    var waitTimeMs,
        words;
    words = CurrentSpeechContent.split(' ').length;
    waitTimeMs = words / AVERAGE_WPM * 60 * speedFactor * 1000;
    return waitTimeMs;
}

var ATRTimerID = null;
function CallOnCountDown(secs, prname) {
    if (secs > 0) {
        secs--;
        ATRTimerID = setTimeout("CallOnCountDown(" + secs + ",\"" + prname + "\")", 1000);
    } else {
        if (secs == 0) {
            clearTimeout(ATRTimerID);
            eval(prname);
        }
        ATRTimerID = setTimeout("CallOnCountDown(-1)", 1000);
    }
}

var TimerTurnedOff = false;

function showWarningCautionNote(stepIndex) {
    GoToStepUsingStepIndex(stepIndex, -1);
    $("#btnWCNReturnToStepspanMain" + stepIndex).show();
}

function WCNClose(IDS) {
    document.all("hiddenWCNAcknowledge").value = IDS;
    document.all("btnCWNAcknowledge").click();
    oWindowM.Close();
    if (TimerTurnedOff) {
        btnPlayClick();
    }
};

var msg = "<center><IMG  src='../../images/please-wait.gif' border=0 ><center>";

function OnRequestStart(sender, args) {
    //var obj = document.getElementById("imgPleaseWait");
    //obj.style.display = '';
    //obj.src = 'images/please-wait.gif'
    hideGlossary();
    StopReading();
    document.body.style.cursor = "Wait";
    FontSizeSet = false;
};

var WidthTableSideBar = 0;
var WidthTableNoSideBar = 0;
var WidthSideBar = 0;
var WidthNoSideBar = 0;

function OnResponseEnd(sender, args) {
    if (args.get_eventTarget() == "btnInitialButton") {
        // body_onload();
    } else {
        if (hasTable) {
            document.all("tdStepHTML").className = 'tdStepHTMWithTable';
        } else {
            if (hasSideBar) {
                document.all("tdStepHTML").className = 'tdStepHTMNoTableWithSidebar';
            } else {
                document.all("tdStepHTML").className = 'tdStepHTMNoTable';
            }
        }

        if (WidthTableSideBar == 0) {
            WidthTableSideBar = document.all("tdStepHTML").offsetWidth - 30;
        }
        if (WidthTableNoSideBar == 0) {
            WidthTableNoSideBar = document.all("tdStepHTML").offsetWidth + 70;
        }
        if (WidthSideBar == 0) {
            WidthSideBar = document.all("tdStepHTML").offsetWidth - 100;
        }
        if (WidthNoSideBar == 0) {
            WidthNoSideBar = document.all("tdStepHTML").offsetWidth;
        }

        ShowMessageGOTOStep = false;
        try {
            if (hasTable) {
                document.all("divStepHTM").style.width = WidthTableSideBar;
                if (hasSideBar) {
                } else {
                    document.all("divStepHTM").style.width = WidthTableNoSideBar;
                }
            } else {
                if (hasSideBar) {
                    document.all("divStepHTM").style.width = WidthSideBar;
                } else {
                    document.all("divStepHTM").style.width = WidthNoSideBar;
                }
            }
        } catch (exception) {
        }

        if (document.all("tdSideBar").innerHTML == "") {
            document.all("tdParentSideBar").style.display = "none";
            document.all("tdStepHTML").width = "100%";
        } else {
            //document.all("tdParentSideBar").style.display = "none";
            document.all("tdParentSideBar").style.display = "";
            //alert(document.all("tdStepHTML").width);
        }

        hasSideBar = false;
        var tempimgType = imgType;
        //SetFontSize();
    }
    setTimeout("SetHeight()", 500);
    document.body.style.cursor = "Default";
    try {
        WCNSetUP();
    } catch (e) {
    }
};

var InitHeight = 0;

function ShowHideNav() {
    if (InitHeight == 0) {
        InitHeight = (document.all("trMainContent").offsetHeight - 100);
    }
    if (document.all("trNavigationControls").style.display == "none") {
        document.all("trNavigationControls").style.display = "";
        //document.all("trMainContent").height = InitHeight - 64;
    } else {
        //document.all("trMainContent").style.height = InitHeight + 64;
        document.all("trNavigationControls").style.display = "none";
    }
};

function PreviousContextClick(obj, e) {
    var menu = $find("contextShowPreviousMenu");
    var left = getAbsoluteLeft(obj);
    var top = getAbsoluteTop(obj);
    top = top - (menu.get_items().get_count() / 2) * 30;
    //	alert(top + " Left=" + left);
    menu.showAt(left, top);
    $telerik.cancelRawEvent(e);
    e.cancelBubble = true;
    if (e.stopPropagation) {
        e.stopPropagation();
    }
};

function NextContextClick(obj, e) {
    var menu = $find("contextShowNextMenu");
    var left = getAbsoluteLeft(obj) - 120;
    var top = getAbsoluteTop(obj);
    menu.showAt(left, top - (menu.get_items().get_count() / 2) * 30);
    $telerik.cancelRawEvent(e);
};

var imgType = "";
var imgid = "";

function reziseStepAttachment(type, id) {
    imgType = type;
    imgid = id;
    if (document.all("spanStepHTML") != null) {
        var maxHeight = document.all("divStepHTM").offsetHeight - document.all("spanStepHTML").offsetHeight - 70;
        if (maxHeight < 96) {
            maxHeight = 96;
        }
    }
    try {
        if (type == "I") {
            //alert(document.all("imgSingleAttachment"));
            if (document.all("imgSingleAttachment") != null) {
                //alert(document.all("imgSingleAttachment").src);
                var dimension = ResizeImage(document.all("imgSingleAttachment").src, 800, maxHeight);
                //alert(dimension[1]);
                document.all("imgSingleAttachment").height = dimension[1];
                document.all("imgSingleAttachment").width = dimension[0];
                if (dimension[1] < maxHeight && dimension[0] < 800) {
                    document.all("imgSingleAttachment").removeAttribute("onClick");
                    document.all("imgSingleAttachment").style.cursor = "default";
                }
            }
        } else {
            if (document.all(id) != null) {
                //document.all(id).width = '100%';
                if (document.all(id).height != "") {
                    if (document.all(id).height > maxHeight) {
                        document.all(id).height = maxHeight;
                    }
                }
            }
        }
    } catch (exception) {
    }
};

function doKeyPress(e) {
    switch (e.keyCode) {
        case 32:
        case 13:
        case 39:
            document.all("btnNext").click();

            break;
        case 8:
        case 37:
            document.all("btnPrevious").click();

            break;
    }
};

function doMouseClickOnBody(e) {
    //document.all("btnNext").click();
};

function GoToStepIntro(value) {
    document.all("hiddenStepIndex").value = value;
    document.all("btnStepChangerForIntro").click();
};

function ContextMenuItemClicked(sender, args) {
    var itemValue = args.get_item().get_value();
    switch (itemValue) {
        case "EC":
            //document.all("btnShowEffectiveChangesScreen").click();
            ShowEffectiveChange();
            break;
        case "B":
            document.all("btnPrevious").click();
            break;
        case "N":
            document.all("btnNext").click();
            break;
        case "P":
            document.all("btnGoToPreviousSection").click();
            break;
        case "NS":
            document.all("btnGoToNextSection").click();
            break;
        case "PCS":
            document.all("btnGoToPreviousChangedStep").click();
            break;
        case "NCS":
            document.all("btnGoToNextChangedStep").click();
            break;
        case "S":
            document.all("btnGoToBeggining").click();
            break;
        case "E":
            document.all("btnGoToEnd").click();
            break;
        case "PFS":
            document.all("btnGoToPreviousFlaggedStep").click();
            break;
        case "NFS":
            document.all("btnGoToNextFlaggedStep").click();
            break;
        case "EN":

        case "NP":
            document.all("btnSwitchNavigation").click();
            break;
        case "PIS":
            document.all("btnGoToPreviousIncompleteStep").click();
            break;
        case "NIS":
            document.all("btnGoToNextIncompleteStep").click();
            break;
    }
};

function doUnderLine(obj) {
    obj.className = 'propLabelWhiteSmallUnderline';
};

function undoUnderLine(obj) {
    obj.className = 'propLabelLightgreySmall';
};

function GoFromWcnToStep() {
    try {
        var stepInfo,
            nextStep = GetReturnWcnNextStep(CurrentStepIndex);
        while (true) {
            stepInfo = window["step" + nextStep.stepIndex];
            if (!stepInfo.IsWarning && !stepInfo.IsCaution && !stepInfo.IsNote) {
                GoToStepUsingStepIndex(nextStep.stepIndex, -1);
                break;
            } else {
                nextStep = GetReturnWcnNextStep(nextStep.stepIndex);
            }
        }
    } catch (err) {
        alert("An error occurred during navigation: " + err);
    }
}

function GetReturnWcnNextStep(currentStepIndex) {
    if (NOTE_PAIRING_MODE == NotePairingModeEnum.WithFollowingStep) {
        return GetNextStepIndex(currentStepIndex, -1, false);
    } else if (NOTE_PAIRING_MODE == NotePairingModeEnum.WithPreviousStep) {
        return GetPreviousStepIndex(currentStepIndex, -1, false);
    } else {
        throw "Invalid Warning Caution Note Pairing Mode!";
    }
}

function chkDisableSpeechChanged(chkbxDisableSpeech) {
    if (chkbxDisableSpeech.checked) {
        try {
            document.all("SpeechControl").StopReading();
        } catch (e) {
            if (e.message == SPEECH_ACTIVEX_ERROR) {
                HandleActiveXSecuritySpeechControlError();
            } else {
                throw e;
            }
        }
    }
}

function LaunchDocument(docid, viewedId) {
    var i;
    for (i = 0; i < documents.length; i++) {
        if (documents[i][0] == docid) {
            ShowAttachment(docid);
            break;
        }
    }
    for (i = 0; i < ProcedureDocuments.length; i++) {
        if (ProcedureDocuments[i].ID == docid) {
            ProcedureDocuments[i].Viewed = "Y";
            break;
        }
    }
    $("#" + viewedId).text("Yes");
};

function ResizeWindow() {
    var contentHeight = window.innerHeight - ($("#divCBTHeader0").height() + $("#divFooter").height());
    if (navigator.userAgent.indexOf('Firefox') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Firefox') + 8)) >= 3.6) { //Firefox
        //Allow
    } else if (navigator.userAgent.indexOf('Chrome') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Chrome') + 7).split(' ')[0]) >= 15) { //Chrome
        contentHeight = contentHeight - 60;
    } else if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Version') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Version') + 8).split(' ')[0]) >= 5) { //Safari
        //Allow
    } else {
        contentHeight = contentHeight - 11;
    }

    $("#divStepContent").css("height", contentHeight);
    VHeightContent = contentHeight - 170;
    divStepHTMHeightWithAttachment = VHeightContent;
    divStepHTMHeightWithoutAttachment = contentHeight;
}

$(document).ready(function () {
    //alert($("#divCBTHeader0").height());
    //alert($("#divFooter").height());
    var contentWidth = document.all("divStepContent").offsetWidth;
    contentWidth = contentWidth - 100;
    for (var i = IntroSlidesCount; i < TotalSlidesCount; i++) {
        var StepContents = document.all("divZoomStepHTML" + i);
        //$(StepContents).width(contentWidth-100);
        //$(StepContents).height(ContentHeight);
    }

    //var ObjectsToZoom = $("#spanStepHTML");
    /*if (ObjectsToZoom != null) {
if (ObjectsToZoom.length > 1) {
for (var i = 0; i < ObjectsToZoom.length; i++) {
ObjectsToZoom[i].style.height = divStepHTMHeightWithoutAttachment;
ObjectsToZoom[i].style.width = document.all("tdStepHTMNoTable")[i].style.offsetWidth;
}
} else {
ObjectsToZoom.style.width = document.all("tdStepHTMNoTable").style.offsetWidth;
}
}*/
    //document.all("divStepHTM").style.height = VHeightContent - 184;
    //SetHeight();
    //callInitButton();

    //doLoad();

    // $("#ifrDetail").css("height", VHeightContent);
    //tblMainWidth = $(window).width() + 30;
    //tblMainHeight = VHeightContent + 30;
    $("#divBtnExit").bind('selectstart', function () {
        return false;
    });
    $("#btnProcedurePropertiesspanMain").bind('selectstart', function () {
        return false;
    });
    DoZoom();
});
var GlobalLimitList;
function btnshowEquipmentLimitList(limitList) {
    var title = "Limit",
        url = "EquipmentLimit.htm";
    GlobalLimitList = limitList;
    OpenKendoWindow("EquipmentLimitWindow", title, url);
}

function btnExitCBTbtnClick() {
    if (State == 'Normal') {
        var bConfirmResponse = false,
            bTrainingComplete = IsTrainingComplete(),
            bIsMocSession;
        if (COMPLETION_CRITERIA == "I") {
            if (SESSION_TYPE == SessionTypeEnum.PerformanceEvaluation) {
                if (!bTrainingComplete) {
                    bConfirmResponse = confirm("You have not completed all steps. Are you sure you want to exit?");
                    if (bConfirmResponse) {
                        window.external.Exit("", "");
                    }
                }
                else {
                    LaunchEvaluationSummary();//Launch MOC logic included in Eval Summary Page
                }
            } else {
                bIsMocSession = window.external.IsMocSession();
                if (!bTrainingComplete) {
                    bConfirmResponse = confirm("You have not completed all steps. Are you sure you want to exit?");
                } else if (bIsMocSession) {
                    LaunchMocSummary();
                } else {
                    window.external.CompleteSession();
                }
                if (!bIsMocSession && (bTrainingComplete || bConfirmResponse)) {
                    window.external.Exit("", "");
                }
            }
        } else {
            var sd = window.parent,
                scoreInfo;
            if (bTrainingComplete) {
                scoreInfo = GetCbtScore();
                try {
                    sd.SetReachedEnd();
                    sd.SetScore(scoreInfo.pointsEarned, scoreInfo.totalPoints, 0);
                    sd.ConcedeControl();
                } catch (e) {
                    alert("Not in SCORM");
                }
            } else {
                bConfirmResponse = confirm("You have not completed all required training. Are you sure you want to exit? Your progress will be lost. ");
                if (bConfirmResponse) {
                    try {
                        sd.ConcedeControl();
                    } catch (e) {
                        alert('Not In SCORM');
                    }
                }
            }
        }
    }
}

function GetCbtScore() {
    var i,
        quesInfo,
        stepInfo,
        pointsEarned = 0,
        totalPoints = 0;
    for (i = 0; i < QuesInfoSortedByIndex.length; i++) {
        quesInfo = QuesInfoSortedByIndex[i];
        if (quesInfo.PointsEarned !== null && quesInfo.PointsPossible !== null) {
            if (CompletionCriteriaLogic.StepTypeOfInterest === "Changed") {
                stepInfo = GetStepInfoFromQuesIndex(i);
                if (stepInfo.Changed !== true) {
                    break;
                }
            }
            pointsEarned += quesInfo.PointsEarned;
            totalPoints += quesInfo.PointsPossible;
        }
    }
    return {
        pointsEarned: pointsEarned,
        totalPoints: totalPoints
    }
}

function GetStepInfoFromQuesIndex(quesIndex) {
    var i,
        stepInfo;
    for (i = IntroSlidesCount; i < TotalSlidesCount; i++) {
        stepInfo = window["step" + i];
        if ($.inArray(quesIndex, stepInfo.Questions) > -1) {
            return stepInfo;
        }
    }
    return null;
}

function showhideNavigationBar() {
    //todo: fix show hide logic
    //if (document.all("trMainStepStatusControls").style.display == 'none') {
    //    document.all("trMainStepStatusControls").style.display = "";
    //    document.all("trShowHideBar").style.display = "none";
    //} else {
    //    document.all("trMainStepStatusControls").style.display = "none";
    //    document.all("trShowHideBar").style.display = "";
    //}
    //SetHeight();
};

var WidthSetForStatusBar = false;
var tdDivStepStatusWidth = 0;
var tdStepStatusAttachment_WrapperWidth = 0;

function SetHeight() {
    var divStepHtm = document.all("divStepHTM");
    if (divStepHtm) {
        if (hasAttachment) {
            if (document.all("trMainStepStatusControls").style.display == 'none') {
                divStepHtm.style.height = VHeightContent - 177;
            } else {
                divStepHtm.style.height = VHeightContent - 184;
            }
        } else {
            if (document.all("trMainStepStatusControls").style.display == 'none') {
                divStepHtm.style.height = VHeightContent - 2;
            } else {
                divStepHtm.style.height = VHeightContent - 37;
            }
        }
    }
    if (document.all("trMainStepStatusControls").style.display == 'none') {
        // alert("trMainStepStatusControls display=none");
        var heightToDeduct = 35;
        document.all("tblInnerContent" + CurrentStepIndex).style.height = VHeightContent + heightToDeduct;
        //document.all("cbtStepContentS").style.height = VHeightContent + heightToDeduct;
        //document.all("divCBTFrameandStep").style.height = VHeightContent + heightToDeduct;
        //document.all("trAllContent").style.height = VHeightContent + heightToDeduct;
        //document.all("tblContent").style.height = VHeightContent + heightToDeduct;
        //document.all("dvMainContentTblWrap").style.height = VHeightContent + heightToDeduct;
        document.all("tdMainContent").style.height = VHeightContent + heightToDeduct;
        document.all("trMainContent").style.height = VHeightContent + heightToDeduct;
    } else {
        // alert("trMainStepStatusControls display=NOT none");
        document.all("tblInnerContent" + CurrentStepIndex).style.height = VHeightContent - 37;
        //document.all("cbtStepContentS").style.height = VHeightContent - 13;
        //document.all("divCBTFrameandStep").style.height = VHeightContent + 3;
        //document.all("trAllContent").style.height = VHeightContent + 3;
        //document.all("tblContent").style.height = VHeightContent + 3;
        //document.all("dvMainContentTblWrap").style.height = VHeightContent + 3;
        document.all("tdMainContent").style.height = VHeightContent + 3;
        document.all("trMainContent").style.height = VHeightContent + 3;
        // alert(document.all("cbtStepContentS").style.height);
    }
    VHeightContent = VHeightContent - 0;
    var IframeHeight = VHeightContent;
    if (document.all("trMainStepStatusControls").style.display == 'none') {
        IframeHeight = VHeightContent + 35;
    } else {
        IframeHeight = VHeightContent;
    }
    //document.all("ifrDetail").style.height = IframeHeight;
    //alert("IframeHeight"+IframeHeight);
    reziseStepAttachment(imgType, imgid);
    //if (!WidthSetForStatusBar) {
    var statusbarWidth = document.all("tdStepStatus").offsetWidth;
    //alert(statusbarWidth);
    if (statusbarWidth != 0) {
        //	alert("setting");
        if (tdDivStepStatusWidth == 0) {
            tdDivStepStatusWidth = statusbarWidth - 2;
            tdStepStatusAttachment_WrapperWidth = tdDivStepStatusWidth - 1;
        }
        //if (document.all("hiddentdDivStepStatusWidth").value == "") {
        //    document.all("hiddentdDivStepStatusWidth").value = tdDivStepStatusWidth + "px";
        //    document.all("hiddentdStepStatusAttachment_WrapperWidth").value = tdStepStatusAttachment_WrapperWidth + "px";
        //}
        //document.all("tdStepStatusAttachment_Wrapper").style.cssText = 'width:' + statusbarWidth + ' !important';
        //document.all("tdStepStatusAttachment_Wrapper").setAttribute("style","width:"+ statusbarWidth+ " !important")
        //alert(tdStepStatusAttachment_WrapperWidth);
        //WidthSetForStatusBar = true;
    }
    //var wrapperDiv = document.getElementById('tdStepStatusAttachment_Wrapper');
    //var contentDiv = document.getElementById('tdStepStatusAttachment_Content');
    //var contentDivWidth = contentDiv.scrollWidth - wrapperDiv.offsetWidth;
    ////alert(contentDivWidth);
    //if (contentDivWidth == 0) {
    //    document.all("tdScrollRight").style.display = "none";
    //    document.all("tdScrollLeft").style.display = "none";
    //} else {
    //    document.all("tdScrollRight").style.display = "";
    //    document.all("tdScrollLeft").style.display = "";
    //}
};

function ViewEquipment(obj) {
    lEquipmentRefID = obj.EquipmentID;
    var WinSettings = "center:yes;resizable:no;dialogHeight:675px;dialogWidth:900px;scroll:no;status:no;";
    var vRet = "";
    vRet = window.showModalDialog('../../Equipment/Reports/Equipment.aspx?EID=' + lEquipmentRefID + '&Mode=View',
        vRet,
        WinSettings);
    // window.radopen('../../Equipment/Properties/ATREquipmentProperties.aspx?lEquipmentRefID=' + lEquipmentRefID + "&From=CBT", "EquipmentDialog");
    return false;
};

function WCNSetUP() {
    if (hasAttachment) {
        if (document.all("trMainStepStatusControls").style.display == 'none') {
            document.all("wcnMaterTable").style.height = VHeightContent - 270;
        } else {
            document.all("wcnMaterTable").style.height = VHeightContent - 280;
        }
    } else {
        if (document.all("trMainStepStatusControls").style.display == 'none') {
            document.all("wcnMaterTable").style.height = VHeightContent - 102;
        } else {
            document.all("wcnMaterTable").style.height - 137;
        }
    }
    //alert("T");
    // document.all("wcnMaterTable").height = document.all("divStepHTM").offsetHeight;
    // document.all("wcnMaterTable").width = document.all("divStepHTM").offsetWidth-100;
};

var scrollValue = 0;

function ScrollStatusBar(dir, val) {
    var wrapperDiv = document.getElementById('tdStepStatusAttachment_Wrapper');
    var contentDiv = document.getElementById('tdStepStatusAttachment_Content');

    var contentDivWidth = contentDiv.scrollWidth - wrapperDiv.offsetWidth;
    scrollValue = scrollValue + val;
    //alert(scrollValue);
    var ContentLeft = Math.abs(parseInt(contentDiv.style.left));
    //alert(AvailWidth);

    if (isNaN(ContentLeft)) {
        ContentLeft = 0;
    }
    //alert(dir);
    if (dir == "R") {
        if (wrapperDiv.offsetWidth < contentDiv.scrollWidth - ContentLeft) {
            contentDiv.style.left = scrollValue + 'px';
        }
    } else {
        var cLeft = parseInt(contentDiv.style.left);
        if (isNaN(cLeft)) {
            cLeft = 0;
        }
        //alert(cLeft);
        if (cLeft <= 0) {
            contentDiv.style.left = scrollValue + 'px';
        }
    }
};

//Script for Exit Button
var btnExitCBTimgLeftCapImageMouseOver = new Image();

btnExitCBTimgLeftCapImageMouseOver.src = 'images/button-left-over.png';

var btnExitCBTimgRightCapImageMouseOver = new Image();

btnExitCBTimgRightCapImageMouseOver.src = 'images/button-right-over.png';

var btnExitCBTimgMiddleCapImageMouseOver = new Image();

btnExitCBTimgMiddleCapImageMouseOver.src = 'images/button-middle-over.png';

var btnExitCBTimgLeftCapImageMouseDown = new Image();

btnExitCBTimgLeftCapImageMouseDown.src = '';

var btnExitCBTimgRightCapImageMouseDown = new Image();

btnExitCBTimgRightCapImageMouseDown.src = '';

var btnExitCBTimgMiddleCapImageMouseDown = new Image();

btnExitCBTimgMiddleCapImageMouseDown.src = '';

var btnExitCBTimgLeftCapImage = new Image();

btnExitCBTimgLeftCapImage.src = 'images/button-left.png';

var btnExitCBTimgRightCapImage = new Image();

btnExitCBTimgRightCapImage.src = 'images/button-right.png';

var btnExitCBTimgMiddleCapImage = new Image();

btnExitCBTimgMiddleCapImage.src = 'images/button-middle.png';

function btnExitCBTmOverBtn(divBtn) {
    document.all('btnExitCBTtdLeftCap').style.backgroundImage = "url(images/button-left-over.png)";
    document.all('btnExitCBTtdRightCap').style.backgroundImage = "url('images/button-right-over.png')";
    document.all('btnExitCBTtdButtonImage').style.backgroundImage = "url('images/button-middle-over.png')";
};

function btnExitCBTmOutBtn(divBtn) {
    document.all('btnExitCBTtdLeftCap').style.backgroundImage = "url(images/button-left.png)";
    document.all('btnExitCBTtdRightCap').style.backgroundImage = "url(images/button-right.png)";
    document.all('btnExitCBTtdButtonImage').style.backgroundImage = "url(images/button-middle.png)";
};

//End Script for Exit Button

//More Details Button from Procedure Details
function btnProcedurePropertiesmOverBtn(divBtn) {
    document.all('btnProcedurePropertiestdLeftCap').background = 'images/button-left-over.png';
    try {
        document.all('btnProcedurePropertiestdRightCap').background = 'images/button-right-over.png';
    } catch (Exception) {
    }
    try {
        document.all('btnProcedurePropertiestdButtonImage').background = 'images/button-middle-over.png';
    } catch (Exception) {
    }
    try {
        document.all('btnProcedurePropertiestdContent').background = 'images/button-middle-over.png';
    } catch (Exception) {
    }
};

function btnProcedurePropertiesmOutBtn(divBtn) {
    document.all('btnProcedurePropertiestdLeftCap').background = 'images/button-left.png';
    try {
        document.all('btnProcedurePropertiestdRightCap').background = 'images/button-right.png';
    } catch (Exception) {
    }
    try {
        document.all('btnProcedurePropertiestdButtonImage').background = 'images/button-middle.png';
    } catch (Exception) {
    }
    try {
        document.all('btnProcedurePropertiestdContent').background = 'images/button-middle.png';
    } catch (Exception) {
    }
};

//End More Details Button from Procedure Details

function OpenStepList() {
    var title = "Step Tree",
        url = "StepList.htm";
    OpenKendoWindow("window", title, url);
}

function OpenInitialRoleSelector() {
    RoleSettings.Forced = false;
    RoleSettings.LoadRoles = false;
    RoleSettings.RequiredRoles = null;
    var title = "Assign Roles",
        url = "InitialRoleSelector.htm";
    OpenKendoWindow("rolesWindow", title, url);
}


function OpenRoleSelector() {
    RoleSettings.Forced = false;
    RoleSettings.LoadRoles = true;
    RoleSettings.RequiredRoles = null;
    var title = "Assign Roles",
        url = "InitialRoleSelector.htm";
    OpenKendoWindow("rolesWindow", title, url);
}

function OpenForcedRoleSelector(requiredRoles) {
    RoleSettings.Forced = true;
    RoleSettings.LoadRoles = true;
    RoleSettings.RequiredRoles = requiredRoles;
    var title = "Assign Roles",
        url = "InitialRoleSelector.htm";
    OpenKendoWindow("rolesWindow", title, url);
}

var RoleSettings = {};

function GetRolesParameters() {

}

function OpenNoteDialogue() {
    var title = "Notes";
    OpenKendoWindow("noteWindow", title, null);
}

function OpenNoteMocDialogue() {
    var title = "Change Request Notes";
    OpenKendoWindow("noteMocWindow", title, null);
}

function OpenAttachmentDialogue() {
    var title = "Upload Attachments";
    OpenKendoWindow("attWindow", title, null);
}
function OpenKendoWindowWithBinding(windowId, title, url, data) {
    var kendoWindow = $("#" + windowId).data("kendoWindow").title(title);
    $(".k-window-content k-content k-window-iframecontent").css('overflow', 'auto');
    $(".k-window-content").css('overflow', 'auto');
    $(".k-content").css('overflow', 'auto');
    $(".k-window-iframecontent").css('overflow', 'auto');
    kendoWindow.center();
    kendoWindow.open();
    kendoWindow.refresh({
        url: url,
        data: data
    });
}
function OpenKendoWindow(windowId, title, url) {
    var kendoWindow = $("#" + windowId).data("kendoWindow").title(title);
    $(".k-window-content k-content k-window-iframecontent").css('overflow', 'auto');
    $(".k-window-content").css('overflow', 'auto');
    $(".k-content").css('overflow', 'auto');
    $(".k-window-iframecontent").css('overflow', 'auto');
    kendoWindow.center();
    kendoWindow.open();
    if (url) {
        kendoWindow.refresh({
            url: url
        });
    } else {
        kendoWindow.refresh();
    }
    return kendoWindow;
};

function CloseStepListAndNavigate(stepIndex) {
    $("#window").data("kendoWindow").close();
    GoToStepUsingStepIndex(stepIndex);
};

function IsRolePopulated() {
    return window.external.IsRolePopulated();
}

function GetRolesList() {
    window.external.GetRolesList();
}

function SubmitAndCloseInitialRoleSelector(listOfCheckedItems) {
    UserRoles = listOfCheckedItems;
    var jsonStr = JSON.stringify(UserRoles);
    window.external.SaveRoles(jsonStr);
    $("#rolesWindow").data("kendoWindow").close();
    DisplayStep(CurrentStepIndex, CurrentQuestionIndexInStep);
};

function SubmitEvalSummary(listOfPrintedItems) {
    EvaluationInfo = listOfPrintedItems;
    var jsonStr = JSON.stringify(EvaluationInfo);
    window.external.SaveEvaluationSummary(jsonStr);
    $("#evaluationSummaryWindow").data("kendoWindow").close();
};
function GetCompetencyEvaluation() {
    var percentage = window.external.GetCompetencePercentage();
    return percentage;
};

function LaunchEvaluationSummary() {
    var title = "Evaluation Form",
    url = "EvaluationSummary.htm";
    OpenKendoWindow("evaluationSummaryWindow", title, url);
}

function LaunchMocSummary() {
    var title = "Submit Change Request",
    url = "MocSubmission.html";
    OpenKendoWindow("noteMocWindow", title, url);
}

function CloseMocSummary() {
    $("#noteMocWindow").data("kendoWindow").close();
}

function CloseEvaluation() {
    $("#evaluationSummaryWindow").data("kendoWindow").close();
}
function GoToStepUsingStepMapping(stepId, sharedProcId, sharedStepId) {
    var stepIndex = GetStepIndexFromStepMapping(stepId, sharedProcId, sharedStepId);
    GoToStepUsingStepIndex(stepIndex, -1);
};

//End Step Tree

//Show Attachments
//function CloseAttachmentViewer() {
//    $("#window").data("kendoWindow").close();
//};

function LogAttachmentViewed(attachmentId) {
    getCurrentStepAttachment(attachmentId).Viewed = "Y";
    SetAttachmentStyle(attachmentId, CurrentStepIndex);
};

var oWindowMAttachment;

function ResizeAttachmentViewer() {
    var kendoAttachmentwindow = $("#KendoAttachmentwindow"),
        contentHeight,
        contentWidth;
    if (kendoAttachmentwindow && kendoAttachmentwindow.data("kendoWindow")) {
        contentHeight = $("#tdMainContent").outerHeight() + $("#divFooter").outerHeight();
        contentWidth = window.innerWidth;
        kendoAttachmentwindow.data("kendoWindow").setOptions({
            height: contentHeight,
            width: contentWidth
        });
    }
}

function ShowAttachment(id) {
    var kendoAttachmentwindow = $("#KendoAttachmentwindow");
    kendoAttachmentwindow.kendoWindow({
        draggable: false,
        modal: true,
        resizable: false,
        title: false,
        iframe: true,
        position: {
            top: 65,
            left: 0
        }
    });
    ResizeAttachmentViewer();
    oWindowMAttachment = kendoAttachmentwindow.data("kendoWindow");
    $(".k-window-content k-content k-window-iframecontent").css('overflow', 'hidden');
    $(".k-window-content").css('overflow', 'hidden');
    $(".k-content").css('overflow', 'hidden');
    $(".k-window-iframecontent").css('overflow', 'hidden');
    oWindowMAttachment.open();
    oWindowMAttachment.refresh({
        url: "AttachmentViewer.htm?attID=" + id
    });
    StopReading();
};

function CloseAttachmentViewer() {
    oWindowMAttachment.close();
};

function GetAttachments() {
    if (CurrentStepIndex == 1) {
        return ProcedureDocuments;
    } else {
        var currentStep = eval("step" + CurrentStepIndex);
        return currentStep.documents;
    }
};

//End ShowAttachments
function RenderReviewGrid() {
    $("#gridReview").kendoGrid({
        dataSource: {
            data: ReviewData,
            schema: {
                model: {
                    fields: {
                        Version: { type: "string" },
                        oldStatus: { type: "string" },
                        newStatus: { type: "string" },
                        dateChanged: { type: "string" },
                        AuthorizedBy: { type: "string" },
                        ChangeNotes: { type: "string" }
                    }
                }
            },
            pageSize: 50
        },
        scrollable: false,
        sortable: true,
        columns: [
            {
                field: "Version",
                title: "Version",
                width: "10%",
                align: "Center"
            }, {
                field: "oldStatus",

                title: "Old Status",
                width: "10%"
            }, {
                field: "newStatus",

                title: "New Status",
                width: "10%"
            }, {
                field: "dateChanged",

                title: "Date Changed",
                width: "10%"
            }, {
                field: "AuthorizedBy",

                title: "Authorized By",
                width: "10%"
            }, {
                field: "ChangeNotes",
                title: "Change Notes"
            }
        ]
    });
};

function RenderProcUserFieldGrid() {
    $("#gridProcUserField").kendoGrid({
        dataSource: {
            data: ProcUserFieldData,
            schema: {
                model: {
                    fields: {
                        Name: { type: "string" },
                        Value: { type: "string" }
                    }
                }
            },
            pageSize: 50
        },
        scrollable: false,
        sortable: true,

        columns: [
            {
                field: "Name",
                title: "Name",
                width: "50%",
                align: "Right"
            }, {
                field: "Value",

                title: "Value",
                align: "Left",
                width: "50%"
            }
        ]
    });
};
function IsInteractiveStep(stepType) {
    if (INTERACTIVE_STEP_TYPES.indexOf(stepType) > -1) {
        return true;
    }
    return false;
}

//context menu region
(function ($, window) {
    $.fn.contextMenu = function (settings) {
        return this.each(function () {
            // Open context menu
            $(this).on("contextmenu", function (e) {
                // return native menu if pressing control
                if (e.ctrlKey) return;
                //open menu
                var $menu = $(settings.menuSelector)
                    .data("invokedOn", $(e.target))
                    .show()
                    .css({
                        position: "absolute",
                        left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
                        top: getMenuPosition(e.clientY, 'height', 'scrollTop')
                    })
                    .off('click')
                    .on('click', 'a', function (e) {
                        $menu.hide();
                        var $invokedOn = $menu.data("invokedOn");
                        var $selectedMenu = $(e.target);
                        settings.menuSelected.call(this, $invokedOn, $selectedMenu);
                    });
                return false;
            });
            //make sure menu closes on any click
            $(document).click(function () {
                $(settings.menuSelector).hide();
            });
        });
        function getMenuPosition(mouse, direction, scrollDir) {
            var win = $(window)[direction](),
                scroll = $(window)[scrollDir](),
                menu = $(settings.menuSelector)[direction](),
                position = mouse + scroll;
            // opening menu would pass the side of the page
            if (mouse + menu > win && menu < mouse)
                position -= menu;
            return position;
        }
    };
})(jQuery, window);
//context menu region end



var documents = [['102355', '102355.docx'], ['102183', '102183.dot'], ['102185', '102185.dot']];
var ProcedureDocuments = [];
var StepMappingsSortedByIndex = [{ "StepId": -1, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": "Introduction" }, { "StepId": -1, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": "Procedure Details" }, { "StepId": -1, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": "Table of Contents" }, { "StepId": 1, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 101, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 3, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 29, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 7, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 107, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 108, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 109, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 110, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 111, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 112, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 113, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 114, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 115, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 116, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 8, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 68, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 69, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 70, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 71, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 72, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 9, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 37, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 10, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 117, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 118, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 121, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 5, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 30, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 12, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 14, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 38, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 65, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 41, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 42, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 43, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 44, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 45, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 46, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 47, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 48, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 49, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 50, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 51, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 52, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 53, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 54, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 55, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 56, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 57, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 39, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 40, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 58, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 59, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 66, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 60, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 61, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 62, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 63, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 64, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 67, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 73, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 74, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 75, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 76, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 77, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 78, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 79, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 80, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 81, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 82, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 83, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 84, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 85, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 86, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 87, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 88, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 89, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 90, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 91, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 92, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 93, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 94, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 95, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 96, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 97, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 98, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 99, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 100, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 22, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 105, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 15, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 106, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 23, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 31, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 24, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 122, "ProcId": 110, "SharedProcId": 107, "SharedStepId": 1, "Comments": null }, { "StepId": 25, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 32, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 33, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 34, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 35, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 26, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 27, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 102, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 104, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 28, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 19, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 123, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }, { "StepId": 21, "ProcId": 110, "SharedProcId": null, "SharedStepId": null, "Comments": null }];
var TotalSlidesCount = 113;
var IntroSlidesCount = 3;
ProcedureRoles = ["ASMM – Assistant Senior Mooring Master", "BOP Operator", "MM2 - Mooring Master 2", "MM1- Mooring Master 1", "Terminal CRO", "Export Tanker Chief Officer ", "OMMSO – Offshore Maintenance \u0026 Marine Support Officer", "Deck Officer", "OMMSO Lead"];
var step3 = { "StepID": 1, "ParentSectionID": 1, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Purpose", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step4 = { "StepID": 101, "ParentSectionID": 1, "SharedProcId": null, "SharedStepId": null, "StepTitle": "To enable safe and reliable transfer of ...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step5 = { "StepID": 3, "ParentSectionID": 3, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Scope", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step6 = { "StepID": 29, "ParentSectionID": 3, "SharedProcId": null, "SharedStepId": null, "StepTitle": "This document establishes guidelines for...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step7 = { "StepID": 7, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Health, Enviroment and Safety (HES) – Ha...", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step8 = { "StepID": 107, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Adverse Weather", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step9 = { "StepID": 108, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Fire/ Explosion", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step10 = { "StepID": 109, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "H2S Exposure", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step11 = { "StepID": 110, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "High pressures", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step12 = { "StepID": 111, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Hydrocarbon release (gas or liquid)", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step13 = { "StepID": 112, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Ignition Source", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step14 = { "StepID": 113, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Poor Communication", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step15 = { "StepID": 114, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Simultaneous Operation", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step16 = { "StepID": 115, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Slip, Trip and Fall", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step17 = { "StepID": 116, "ParentSectionID": 7, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Temperature", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step18 = { "StepID": 8, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Personal Protective Equipment (PPE) Requ...", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step19 = { "StepID": 68, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Hard Hat", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step20 = { "StepID": 69, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Leather Gloves", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step21 = { "StepID": 70, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Personal H2S Monitor", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step22 = { "StepID": 71, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Safety Glasses", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step23 = { "StepID": 72, "ParentSectionID": 8, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Steel-Toed Boots", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step24 = { "StepID": 9, "ParentSectionID": 9, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Material \u0026 Equipment", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step25 = { "StepID": 37, "ParentSectionID": 9, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Pressure recorder", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step26 = { "StepID": 10, "ParentSectionID": 10, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Usage Requirements", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step27 = { "StepID": 117, "ParentSectionID": 10, "SharedProcId": null, "SharedStepId": null, "StepTitle": "This Procedure shall be used uncondition...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step28 = { "StepID": 118, "ParentSectionID": 10, "SharedProcId": null, "SharedStepId": null, "StepTitle": "This procedure must be thoroughly review...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step29 = { "StepID": 121, "ParentSectionID": 10, "SharedProcId": null, "SharedStepId": null, "StepTitle": "This Procedure can also be used for trai...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step30 = { "StepID": 5, "ParentSectionID": 5, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Prerequisites / Requirements", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step31 = { "StepID": 30, "ParentSectionID": 5, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Requirements", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step32 = { "StepID": 12, "ParentSectionID": 12, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Operations Readiness Review", "Type": "Procedure Steps", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step33 = { "StepID": 14, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Procedure Sequence", "Type": "Procedure Steps", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step34 = { "StepID": 38, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Exercise of Authority", "Type": "Warning", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": true, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step35 = { "StepID": 65, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Terminal Information Booklet and Crude O...", "Type": "Note", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": true, "Roles": [], "NumberOfStepDocuments": 1, "documents": [{ "ID": 102355, "Name": "Crude Oil Berthing Loading Doc. Term. Copy", "DocType": "R", "Viewed": null, "FileName": null }], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step36 = { "StepID": 41, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "1. Prior to loading", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step37 = { "StepID": 42, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "a. ADVISE BOP Supervisor of impending opera...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["ASMM – Assistant Senior Mooring Master"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step38 = { "StepID": 43, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "b. PREPARE the BOP pressure recorder for lo...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step39 = { "StepID": 44, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "c. CLOSE both Gas Injection valves to SBM 3...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step40 = { "StepID": 45, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "d. VERIFY to MM1 that both Gas Injection va...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step41 = { "StepID": 46, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "e. CONNECT the cargo hoses and fully open t...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM2 - Mooring Master 2"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step42 = { "StepID": 47, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "f. CONDUCT  Pre Transfer Conference, as des...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 1, "documents": [{ "ID": 102183, "Name": "MM-Shore Checklist", "DocType": "R", "Viewed": null, "FileName": null }], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step43 = { "StepID": 48, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "g. AGREE with Chief Officer on Loading Sequ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step44 = { "StepID": 49, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "h. COMPLETE Vessel Line Up Check List.", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 1, "documents": [{ "ID": 102185, "Name": "Vessel Line-Up Checklist", "DocType": "R", "Viewed": null, "FileName": null }], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step45 = { "StepID": 50, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "i. VERIFY line up in CCR.", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step46 = { "StepID": 51, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "j. VERIFY on Deck that tanker cross-over an...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM2 - Mooring Master 2"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step47 = { "StepID": 52, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "k. VERIFY to MM1 that Hose end Valves are o...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM2 - Mooring Master 2"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step48 = { "StepID": 53, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "l. PACK the line when instructed to do so b...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step49 = { "StepID": 54, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "m. NOTIFY MM1 when line is fully packed", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step50 = { "StepID": 55, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "n. OPEN Escravos Incoming valve (MOV-820), ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step51 = { "StepID": 56, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "o. INSTRUCT the Export Tanker CCR to line u...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step52 = { "StepID": 57, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "p. CARRY out the MM-Shore Check List with T...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 1, "documents": [{ "ID": 102183, "Name": "MM-Shore Checklist", "DocType": "R", "Viewed": null, "FileName": null }], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step53 = { "StepID": 39, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Mooring Master Requirement", "Type": "Caution", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": true, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step54 = { "StepID": 40, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Weather Limitations", "Type": "Environmental", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step55 = { "StepID": 58, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "2. Start of Loading", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step56 = { "StepID": 59, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "a. COMMENCE loading at shore minimum - a ra...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step57 = { "StepID": 66, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Pressure Monitoring", "Type": "Warning", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": true, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step58 = { "StepID": 60, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "b. VERIFY to MM1 when flow at the manifold ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM2 - Mooring Master 2"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step59 = { "StepID": 61, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "c. VERIFY to MM1 when receiving cargo in to...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Export Tanker Chief Officer "], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step60 = { "StepID": 62, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "d. OPEN fully, sufficient cargo tanks (3 or...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Export Tanker Chief Officer "], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step61 = { "StepID": 63, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "e. INCREASE gradually to shore maximum. (Ad...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step62 = { "StepID": 64, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "f. STOP the loading if excessive or abnorma...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step63 = { "StepID": 67, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Stoppage", "Type": "Warning", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": true, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step64 = { "StepID": 73, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "3. During Loading", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step65 = { "StepID": 74, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "a. VERIFY throughout the loading that the i...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step66 = { "StepID": 75, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "b. MAKE frequent checks of the export hose ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["OMMSO – Offshore Maintenance \u0026 Marine Support Officer"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step67 = { "StepID": 76, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "c. VERIFY MM2 is  present in the vessel’s c...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step68 = { "StepID": 77, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "d. IDENTIFY possible changes to vessel line...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 1, "documents": [{ "ID": 102185, "Name": "Vessel Line-Up Checklist", "DocType": "R", "Viewed": null, "FileName": null }], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step69 = { "StepID": 78, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "e. COMPARE ship and shore cargo figures at ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step70 = { "StepID": 79, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "f. MONITOR the ship/shore difference and tr...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step71 = { "StepID": 80, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "In determining what constitutes a signif...", "Type": "Warning", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": true, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step72 = { "StepID": 81, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "g. STOP the loading and inform the Senior M...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step73 = { "StepID": 82, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "h. RESUME Loading when ship/shore differenc...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step74 = { "StepID": 83, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "i. MAINTAIN minimum positive I.G. pressure ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Export Tanker Chief Officer "], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step75 = { "StepID": 84, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "4. Completion of Loading", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step76 = { "StepID": 85, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "a. CONSULT with both the vessel and Escravo...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step77 = { "StepID": 86, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "b. ALERT the second Mooring Master to be pr...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step78 = { "StepID": 87, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "c. GIVE Tank Farm Control Room 30 minutes n...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step79 = { "StepID": 88, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "d. NOTIFY Tank Farm Control Room to reduce ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step80 = { "StepID": 89, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "e. NOTIFY the Tanker CCR when there is 20,0...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step81 = { "StepID": 90, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "f. GIVE a half an hour notice to the Tank F...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM1- Mooring Master 1"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step82 = { "StepID": 91, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "g. NOTIFY MM1 when loading completed and co...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step83 = { "StepID": 92, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "h. VERIFY that on completion, hose end valv...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["MM2 - Mooring Master 2"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step84 = { "StepID": 93, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "i. NOTIFY MM1 when Export V/V fully closed ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Terminal CRO"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step85 = { "StepID": 94, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "j. CLOSE Escravos Incoming V/V (MOV-820) an...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step86 = { "StepID": 95, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "k. CLOSE the export valve to the loading be...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step87 = { "StepID": 96, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "l. CLOSE Manifold V/V and start draining ma...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Deck Officer"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step88 = { "StepID": 97, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "m. NOTIFY MM2 when manifold fully drained", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["Deck Officer"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step89 = { "StepID": 98, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "n. CLOSE and lock hose end v/v.", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["OMMSO Lead"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step90 = { "StepID": 99, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "o. OPEN Gas injection Valve to berth SBM 3 ...", "Type": "Action", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": ["BOP Operator"], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step91 = { "StepID": 100, "ParentSectionID": 14, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Hose disconnection shall take place unde...", "Type": "Note", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": true, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step92 = { "StepID": 22, "ParentSectionID": 22, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Signature", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step93 = { "StepID": 105, "ParentSectionID": 22, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Approval Signature Table", "Type": "Table", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step94 = { "StepID": 15, "ParentSectionID": 15, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Consequence of Deviation", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step95 = { "StepID": 106, "ParentSectionID": 15, "SharedProcId": null, "SharedStepId": null, "StepTitle": "COD", "Type": "Table", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step96 = { "StepID": 23, "ParentSectionID": 23, "SharedProcId": null, "SharedStepId": null, "StepTitle": "References", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step97 = { "StepID": 31, "ParentSectionID": 23, "SharedProcId": null, "SharedStepId": null, "StepTitle": "References", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step98 = { "StepID": 24, "ParentSectionID": 24, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Continual Improvement", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step99 = { "StepID": 122, "ParentSectionID": 24, "SharedProcId": 107, "SharedStepId": 1, "StepTitle": "Continual improvement to this document i...", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step100 = { "StepID": 25, "ParentSectionID": 25, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Roles and Responsibilities", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step101 = { "StepID": 32, "ParentSectionID": 25, "SharedProcId": null, "SharedStepId": null, "StepTitle": "1. Mooring Master", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step102 = { "StepID": 33, "ParentSectionID": 25, "SharedProcId": null, "SharedStepId": null, "StepTitle": "2. OMSO (Offshore Mooring Support Officers)", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step103 = { "StepID": 34, "ParentSectionID": 25, "SharedProcId": null, "SharedStepId": null, "StepTitle": "3. Tanker Master", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step104 = { "StepID": 35, "ParentSectionID": 25, "SharedProcId": null, "SharedStepId": null, "StepTitle": "4. Chief Officer", "Type": "Default Step", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step105 = { "StepID": 26, "ParentSectionID": 26, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Measurement and Verification", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step106 = { "StepID": 27, "ParentSectionID": 27, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Communication Protocol", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step107 = { "StepID": 102, "ParentSectionID": 27, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Comms", "Type": "Note", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": true, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step108 = { "StepID": 104, "ParentSectionID": 27, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Communication Table", "Type": "Table", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step109 = { "StepID": 28, "ParentSectionID": 28, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Holds List", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step110 = { "StepID": 19, "ParentSectionID": 19, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Procedure Approved By Signatures", "Type": "Default Section", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step111 = { "StepID": 123, "ParentSectionID": 19, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Approval Signature Table", "Type": "Table", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var step112 = { "StepID": 21, "ParentSectionID": 21, "SharedProcId": null, "SharedStepId": null, "StepTitle": "Summary of Revisions", "Type": "Summary of Changes", "Changed": false, "Viewed": null, "Acknowledged": false, "AcknowledgedDateTime": null, "AcknowledgedPersonName": null, "Flagged": false, "IsWarning": false, "IsCaution": false, "IsNote": false, "Roles": [], "NumberOfStepDocuments": 0, "documents": [], "Questions": null, "EvaluationData": null, "EvaluationDateTime": null };
var QuesInfoSortedByIndex = [];
var COMPLETION_CRITERIA = "I";
var ACKNOWLEDGE_CRITERIA = "A";
var NOTE_PAIRING_MODE = "F";
var INTERACTIVE_STEP_TYPES = ["Action", "Note", "Warning", "Caution"];
var ReviewData = [{ Version: "Benford, Bradley", oldStatus: "Approved", newStatus: "Effective", dateChanged: "1/30/2015 6:51:21 AM", AuthorizedBy: "Benford, Bradley", ChangeNotes: "Approved - B. Benford" }];
var ProcUserFieldData = [{ Name: "Site Code", Value: "TER" }, { Name: "Next Revalidation Due", Value: "29-DEC-17" }, { Name: "Enable Role Column", Value: "Yes" }, { Name: "Signoff Display", Value: "Hide Time & Date Signoffs" }, { Name: "Consequence Ranking", Value: "C2" }, { Name: "Equipment Ranking", Value: "IC2" }, { Name: "Maintenance/Operation Craft Designator ", Value: "O" }, { Name: "Disable Signoff", Value: "No" }, { Name: "System", Value: "25" }, { Name: "OP Categorization", Value: "OP" }];
var Sections = [{ "SectionId": 1, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [4] }, { "SectionId": 3, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [6] }, { "SectionId": 7, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17] }, { "SectionId": 8, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [19, 20, 21, 22, 23] }, { "SectionId": 9, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [25] }, { "SectionId": 10, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [27, 28, 29] }, { "SectionId": 5, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [31] }, { "SectionId": 12, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [] }, { "SectionId": 14, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91] }, { "SectionId": 22, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [93] }, { "SectionId": 15, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [95] }, { "SectionId": 23, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [97] }, { "SectionId": 24, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [99] }, { "SectionId": 25, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [101, 102, 103, 104] }, { "SectionId": 26, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [] }, { "SectionId": 27, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [107, 108] }, { "SectionId": 28, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [] }, { "SectionId": 19, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [111] }, { "SectionId": 21, "AllViewed": false, "AllAcknowledged": false, "StepIndices": [] }];
