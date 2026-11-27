# Graph Report - is-sms  (2026-11-27)

## Corpus Check
- 792 files · ~615,364 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 29 file(s) not represented in the graph (top: .css 20, .otf 4, (none) 3)

## Summary
- 4946 nodes · 18367 edges · 169 communities (155 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 204 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `db03773a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AddParentDetails.jsx
- withSmsAuth
- K5BookView.jsx
- VideoLibrary.jsx
- createDummyStudent
- marketingConsent.js
- session.js
- expireSession
- Stage3CourseSelection.jsx
- k5Calendar.js
- useAddEnrollmentContext.js
- ClubPage
- add-enrollment/ReviewInlineEdit.jsx
- CalendarCard.jsx
- K5AttendanceDetails.jsx
- profileEdit.js
- parentHome.js
- K5Loading
- Cart.jsx
- useSelectedChild
- react
- PaymentResponseView.jsx
- useDummyStudent
- getAccountSession
- hasBackendOrigin
- K5ProfileEditors.jsx
- K5DiaryPanel.jsx
- ParentProgressReports.jsx
- Inbox.jsx
- K5ProfileCustomFields.jsx
- DialogContent
- FeeDetails.jsx
- backendRequest
- MyCertificates.jsx
- react
- package.json
- DatePicker
- inbox.js
- Button
- PaymentGatewayInitView.jsx
- dashboardBootstrap.js
- useStudentCalendar.js
- useEnrollmentContext.js
- ParentAcademicPerformance.jsx
- callServer
- K5Games.jsx
- payloadEncoding.js
- EventDetailModal.jsx
- K5NewsPanel.jsx
- studentSignupBackendApi.js
- FullScreenLoader
- useDashboardContext.js
- EnrollmentWizardShell.jsx
- ProgressReportView.jsx
- logout.js
- AccountForm.jsx
- react-hot-toast
- backendOrigin.js
- AddStage3ReviewPayment.jsx
- CelebrationHost.jsx
- student-enroll/FeePaymentPlans.jsx
- StudentHomeK5.jsx
- BookClassSlotModal.jsx
- ContactCheckModal.jsx
- useAppearance
- error.jsx
- components.json
- useInbox.js
- FeeDetails.jsx
- ParentProfileDetails.jsx
- PaymentResponseView
- PicoGuide.jsx
- add-enrollment/FeePaymentPlans.jsx
- profileModel.js
- AddCreatePassword.jsx
- diaryApi.js
- k5Bits.jsx
- ClassFeedbackHost.jsx
- AiAdvisorDialog.jsx
- withSmsAuth
- ParentAttendance.jsx
- K5NavRail.jsx
- K5Attendance.jsx
- AiAdvisorDialog
- package.json
- sessionState.js
- AcademicYearExtension.jsx
- K5Performance.jsx
- cartApi.js
- verifyAccountAuth.mjs
- BookedClasses.jsx
- ForcedPasswordChange.jsx
- OnboardingSetup.jsx
- AnnouncementDetailModal.jsx
- useContactCheck.js
- K5Shell.jsx
- dummyStudent.js
- student-enroll/PaymentGatewayPickerModal.jsx
- k5Fonts.js
- scheduleRows.js
- parentDashboardApi.js
- K5AssignedTeacher.jsx
- Image Optimization and Next.js Image Component Rules
- useIntlTelInput
- K5BookedView.jsx
- AI Course Advisor — Implementation Plan
- useStudentProfile.js
- bookClassApi.js
- ParentAppInstallPrompt.jsx
- DemandBookPanel.jsx
- scripts
- useStudentDashboardData
- useSpeech
- parentPost
- ReEnrollmentOptions.jsx
- AI Course Advisor — Rollout Runbook (Phase 6)
- paymentResponseApi.js
- dashboardNav.js
- prepareMarksheetFiles
- verifyContactCheckFlow.mjs
- AGENTS.md
- devApiLog.js
- compilerOptions
- serverApi.js
- vercel.json
- LocationConstant.js
- postcss.config.mjs
- contactCheckCopy.js
- ParentTableFooter.jsx
- RightActionRail.jsx
- ChristmasProvider.jsx
- dummyInbox.js
- K5Profile.jsx
- learningProgramTheme.js
- picoEvents.js
- K5InboxCompose.jsx
- lucide-react
- K5Toolbar.jsx
- AppDownloadDialog.jsx
- D3 — Transcript: Diploma link and "(New)" label
- ReserveSeatForNextGrade.jsx
- RightActionRail.jsx
- baseDate
- classesForDay
- PaymentInProgressModal.jsx
- OnboardingWelcome.jsx
- ClassSummarySheet.jsx
- AppearanceProvider.jsx
- K5Select.jsx
- Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)
- ChildPicker.jsx
- K5LiveClassWatcher.jsx
- K5Header.jsx
- ShapeLayer.js
- K5Extension.jsx
- AccountSetupSection.jsx
- K5CompleteProfileModal.jsx
- login-credentials/route.js
- ref_node_assert
- K5Transcript.jsx
- 5. Progress
- ExamDetails.jsx
- verifyPaymentAttemptRecovery.mjs
- useContactSummary.js
- parent/[...module]/page.jsx

## God Nodes (most connected - your core abstractions)
1. `useDashboardContext()` - 321 edges
2. `react` - 302 edges
3. `lucide-react` - 185 edges
4. `useDummyStudent()` - 151 edges
5. `next` - 141 edges
6. `hasBackendOrigin()` - 141 edges
7. `DialogContent()` - 121 edges
8. `@tanstack/react-query` - 118 edges
9. `Dialog()` - 118 edges
10. `DialogTitle()` - 117 edges

## Surprising Connections (you probably didn't know these)
- `Phase 4 — transactional flows` --references--> `showDummyStripeCheckoutPage()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → utils/paymentGatewayChecks.js
- `5. Progress` --references--> `useStudentCalendar()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → hooks/useStudentCalendar.js
- `2. Rules the user set (follow them always)` --references--> `OptimizedImage()`  [INFERRED]
  docs/migration/student_dashboard_claude_handoff_2026-11-14.md → components/common/OptimizedImage.jsx
- `2. Rules the user set (follow them always)` --references--> `K5Loading()`  [INFERRED]
  docs/migration/student_dashboard_claude_handoff_2026-11-14.md → components/k5/K5Skeletons.jsx
- `2. Rules the user set (follow them always)` --references--> `usePicoContentReady()`  [INFERRED]
  docs/migration/student_dashboard_claude_handoff_2026-11-14.md → components/k5/pico/picoEvents.js

## Import Cycles
- 2-file cycle: `components/k5/pages/K5ProfileEditors.jsx -> components/k5/pages/K5ProfileEditorsP3.jsx -> components/k5/pages/K5ProfileEditors.jsx`

## Communities (169 total, 14 thin omitted)

### Community 0 - "AddParentDetails.jsx"
Cohesion: 0.12
Nodes (44): AddParentDetails(), clearErrors(), handleSubmit(), toggleSameAsStudent(), defaultFields(), ParentRelationFields(), handleRelationChange(), persistOther() (+36 more)

### Community 1 - "withSmsAuth"
Cohesion: 0.12
Nodes (21): POST(), Browser sign-in with SMS tokens (several users per browser), Checks, Cookies (all HttpOnly, Secure, SameSite=Lax, Path=/), How a request finds its user, Known limits, Settings, Signing in and out (+13 more)

### Community 2 - "K5BookView.jsx"
Cohesion: 0.11
Nodes (34): K5CardsSkeleton(), AllUsed(), BookArt(), BookHeader(), BookPageSkeleton(), CapTile(), COPY, dayModel() (+26 more)

### Community 3 - "VideoLibrary.jsx"
Cohesion: 0.08
Nodes (77): VideoLibraryPage(), AccessBar(), CourseChips(), K5VideoLibrary(), ModuleHeading(), Row(), Stage(), tint() (+69 more)

### Community 4 - "createDummyStudent"
Cohesion: 0.13
Nodes (25): createDummyStudent(), addToCart(), announcementRows(), announcements(), assignedTeacher(), bookClassDetails(), bookClassSubjectRows(), cartDate() (+17 more)

### Community 5 - "marketingConsent.js"
Cohesion: 0.11
Nodes (34): CampaignCookieInitializer(), ConsentBanner(), Switch(), collectMetaParams(), getClientIp(), LEADS_API_BASE_URL, assert(), assertCandidates() (+26 more)

### Community 6 - "session.js"
Cohesion: 0.08
Nodes (61): ChooseAccountPage(), describe(), metadata, schoolLogo(), GET(), POST(), GET(), safeReturn() (+53 more)

### Community 7 - "expireSession"
Cohesion: 0.06
Nodes (69): ReEnrollmentCourseSelectionPage(), ReEnrollmentLayout(), ReEnrollmentPaymentPage(), Frame(), ReEnrollmentChrome(), useCustomPlanWatch(), ReEnrollmentReviewPage(), ReEnrollmentCourseSelection() (+61 more)

### Community 8 - "Stage3CourseSelection.jsx"
Cohesion: 0.05
Nodes (84): AddStage2CourseSelection(), addSubject(), applyChange(), ask(), confirmRecommended(), handleAiApplied(), handleFailure(), handleGradeChange() (+76 more)

### Community 9 - "k5Calendar.js"
Cohesion: 0.08
Nodes (45): ClassFeedbackModal(), DashboardLoadingSkeleton(), HomeBody(), MyClassesBody(), noSubscribe(), PlannerBody(), readSavedHand(), Assignments() (+37 more)

### Community 10 - "useAddEnrollmentContext.js"
Cohesion: 0.10
Nodes (41): safeAddEnrollmentPath(), AddEnrollmentEntryPage(), AddEnrollmentEntryRedirect(), ADD_WIZARD_STEPS, ADD_WIZARD_STEPS_FLEX, AddEnrollmentChrome(), AddWizardFrame(), SEGMENT_TO_STEP_KEY (+33 more)

### Community 11 - "ClubPage"
Cohesion: 0.08
Nodes (27): ChineseClubPage(), CompetitiveGamingClubPage(), EnglishClubPage(), FocusReactionTrainingClubPage(), FrenchClubPage(), GameStrategyAnalysisClubPage(), GermanClubPage(), GlobalCompetitionsClubPage() (+19 more)

### Community 12 - "add-enrollment/ReviewInlineEdit.jsx"
Cohesion: 0.07
Nodes (69): AddStage1StudentDetails(), handleSubmit(), FieldSkeleton(), GENDER_OPTIONS, INITIAL_FIELDS, LEARNING_PROGRAMS, Stage1Skeleton(), validateAddStudentFields() (+61 more)

### Community 13 - "CalendarCard.jsx"
Cohesion: 0.07
Nodes (54): isJoinableClass(), StudentCalendarCard(), titleFor(), VIEW_TABS, CalendarClockPill(), getTimeOfDay(), TIME_OF_DAY_STYLE, CalendarDatepicker() (+46 more)

### Community 14 - "K5AttendanceDetails.jsx"
Cohesion: 0.10
Nodes (46): COLUMNS, DETAILED_LABEL, joinedNote(), K5AttendanceDetails(), rowKind(), Time(), filterRows(), monthEndYmd() (+38 more)

### Community 15 - "profileEdit.js"
Cohesion: 0.14
Nodes (28): useProfileEditor(), buildDraft(), buildEditContext(), buildUnits(), countryName(), DATE_FORMAT, editableCustomFields(), EMPTY_MESSAGE (+20 more)

### Community 16 - "parentHome.js"
Cohesion: 0.12
Nodes (37): ParentHomePage(), PaymentName(), TodaySession(), BLUE_DOODLES_HTML, ChildBlueTile(), ChildKpiTrio(), KavInner(), LiveClassPopup() (+29 more)

### Community 17 - "K5Loading"
Cohesion: 0.11
Nodes (39): K5BlockSkeleton(), K5HomeLeftSkeleton(), K5Loading(), K5PlanSkeleton(), K5ProfileSkeleton(), K5Sk(), K5TeacherSkeleton(), K5TilesSkeleton() (+31 more)

### Community 18 - "Cart.jsx"
Cohesion: 0.08
Nodes (49): CartPage(), BuyExtraClassesPage(), BuyExtraSkeleton(), BuyHeader(), gradeLabel(), K5BuyExtraClasses(), K5BuyExtraNotice(), MiddlePlans() (+41 more)

### Community 19 - "useSelectedChild"
Cohesion: 0.08
Nodes (46): ParentChildScope(), Page(), ParentFeeDetailsPage(), Page(), ParentAssignedTeachersPage(), VIEWS, DownloadButton(), HEADERS (+38 more)

### Community 20 - "react"
Cohesion: 0.11
Nodes (33): AddParentDetailsStep(), AddEnrollmentParentDetailsPage(), CourseSelectionStep(), StudentEnrollmentStep3Page(), WizardLayout(), StudentEnrollmentStep2Page(), ParentDetailsStep(), StudentEnrollmentStep4Page() (+25 more)

### Community 21 - "PaymentResponseView.jsx"
Cohesion: 0.12
Nodes (43): AccountInfoCard(), AddEnrollmentAccountInfo(), AddEnrollmentThankYouReplay(), buildRedirectHref(), CircularCountdown(), ConfirmingCard(), ContactEmail(), CopyButton() (+35 more)

### Community 22 - "useDummyStudent"
Cohesion: 0.18
Nodes (13): useParentRailCounts(), readSearch(), readSearchOnServer(), subscribe(), useDummyStudent(), useStudentAcademicPerformance(), toDate(), useStudentGradebookReport() (+5 more)

### Community 23 - "getAccountSession"
Cohesion: 0.09
Nodes (39): GET(), isStorageHost(), reply(), STORAGE_HOSTS, GET(), reply(), POST(), reply() (+31 more)

### Community 24 - "hasBackendOrigin"
Cohesion: 0.11
Nodes (67): useClubModule(), readSeen(), useSpecialHelp(), send(), writeSeen(), authHeaders(), availAcademicYearExtension(), changePassword() (+59 more)

### Community 25 - "K5ProfileEditors.jsx"
Cohesion: 0.13
Nodes (37): border(), ChipToggle(), EditableHobbies(), EditableParent(), EditableParents(), EditablePersonal(), EditableSocial(), EditDate() (+29 more)

### Community 26 - "K5DiaryPanel.jsx"
Cohesion: 0.14
Nodes (43): DiaryAvatar(), DiaryLoadError(), DiaryMessageText(), FloatingDateChip(), DiaryEntryCard(), DiaryPanel(), DiarySkeleton(), formatWhen() (+35 more)

### Community 27 - "ParentProgressReports.jsx"
Cohesion: 0.11
Nodes (26): ParentProgressPage(), HEADERS, ParentProgressReports(), ProgressForChild(), StatusText(), assetUrl(), downloadQuery(), EnrollmentReport() (+18 more)

### Community 28 - "Inbox.jsx"
Cohesion: 0.10
Nodes (47): InboxComposePage(), InboxPage(), Filters(), FOLDER_ICONS, Folders(), InboxHeader(), K5Inbox(), MessageList() (+39 more)

### Community 29 - "K5ProfileCustomFields.jsx"
Cohesion: 0.12
Nodes (28): VariantToggle(), OfflineForm(), Choice(), ChoiceField(), CustomFields(), DateField(), FileField(), Purpose() (+20 more)

### Community 30 - "DialogContent"
Cohesion: 0.11
Nodes (42): InfoModal(), LogoutConfirmDialog(), K5_VARIANTS, k5Skin, STANDARD_VARIANTS, StandardShell(), standardSkin, ReserveFeeDialog() (+34 more)

### Community 31 - "FeeDetails.jsx"
Cohesion: 0.09
Nodes (34): ProgressReportsPage(), LoginHistoryPage(), PerformancePage(), assetUrl(), HEADERS, LoginHistory(), SummaryCard(), TONES (+26 more)

### Community 32 - "backendRequest"
Cohesion: 0.11
Nodes (44): GET(), POST(), reply(), TYPES, postDocuments(), useProfileActions(), addActivity(), addClassTime() (+36 more)

### Community 33 - "MyCertificates.jsx"
Cohesion: 0.12
Nodes (39): MyCertificatesPage(), CapIcon(), CertCardSkeleton(), CertHeader(), K5Certificates(), Overlay(), PILL, RequestDialog() (+31 more)

### Community 34 - "react"
Cohesion: 0.10
Nodes (21): caveat, metadata, openSans, RootLayout(), viewport, AnalyticsScripts(), TAB_ACCOUNT_STORAGE_KEY, TabAccount() (+13 more)

### Community 35 - "package.json"
Cohesion: 0.07
Nodes (30): dependencies, apexcharts@^8.6.0, @base-ui/react@^1.8.0, class-variance-authority@^0.7.1, cn@^0.3.0, date-fns@^4.4.0, date-fns-tz@^3.2.0, dompurify@^3.4.18 (+22 more)

### Community 37 - "DatePicker"
Cohesion: 0.16
Nodes (17): canAutoFocusSearch(), k5Label(), K5MobileSheet(), K5PopoverList(), K5SelectList(), k5Trigger(), MobileSelectSheet(), PlainFloatingLabelSelect() (+9 more)

### Community 38 - "inbox.js"
Cohesion: 0.09
Nodes (36): draftFor(), EMPTY_DRAFT, useInboxCompose(), all(), charCount(), COMPOSE_CLOSED, composeProblem(), composeWarnings() (+28 more)

### Community 39 - "Button"
Cohesion: 0.11
Nodes (22): ConfirmDialog(), FlaggedSeatsModal(), RecommendedCoursesDialog(), AccountFormOfflineB2B(), handleSubmit(), INITIAL_FIELDS, LEARNING_PROGRAMS, ConfirmDialog() (+14 more)

### Community 40 - "PaymentGatewayInitView.jsx"
Cohesion: 0.14
Nodes (18): AirwallexPaymentInitPage(), StripePaymentInitPage(), AirwallexPaymentInitPage(), StripePaymentInitPage(), NIGHT_HINT_KEY, GATEWAY_CONFIG, getAirwallexCheckoutIntentUrl(), getAirwallexPaymentInitClient() (+10 more)

### Community 41 - "dashboardBootstrap.js"
Cohesion: 0.28
Nodes (14): useNeedHelp(), bootstrapUser(), defaultCalendarRange(), forUser(), state, take(), tier1(), tier2() (+6 more)

### Community 42 - "useStudentCalendar.js"
Cohesion: 0.16
Nodes (25): nowIn(), useK5CalendarModel(), attendanceEntityType(), coveredBy(), getFetchRange(), lazyNeed(), loadStoredPrefs(), monthAsk() (+17 more)

### Community 43 - "useEnrollmentContext.js"
Cohesion: 0.09
Nodes (35): blockedMessage(), noStore, POST(), sameSite(), AccountCreationPage(), searchParamsToQueryString(), EnrollmentContext, useResolveEnrollmentContext() (+27 more)

### Community 44 - "ParentAcademicPerformance.jsx"
Cohesion: 0.11
Nodes (29): ParentAcademicPerformancePage(), CourseRow(), Footer(), PACE_CHIP, ParentAcademicPerformance(), PerformanceBody(), Runner(), svg() (+21 more)

### Community 45 - "callServer"
Cohesion: 0.11
Nodes (39): BADGE, BANK, BankForm(), BankSummary(), clean(), CopyValue(), Modal(), NewRequest() (+31 more)

### Community 46 - "K5Games.jsx"
Cohesion: 0.07
Nodes (65): GAMES, MEMORY_FACES, newCount(), newMath(), newMemory(), newShape(), numOpts(), playPop() (+57 more)

### Community 47 - "payloadEncoding.js"
Cohesion: 0.15
Nodes (13): GET(), withServiceKey(), body, request, noPlusResult, plusResult, roundTrip(), createAddEnrollmentPassword() (+5 more)

### Community 48 - "EventDetailModal.jsx"
Cohesion: 0.16
Nodes (29): ActivityDetailsModal(), Countdown(), pad(), calendarButtonClass(), CalendarModal(), calendarNoteClass(), DetailRow(), AssignmentDetail() (+21 more)

### Community 49 - "K5NewsPanel.jsx"
Cohesion: 0.23
Nodes (20): isAnimatedSource(), isRemoteSource(), OptimizedImage(), ArticleBlock(), NewsAllModal(), NewsDetailModal(), formatNewsDate(), NewsPanel() (+12 more)

### Community 50 - "studentSignupBackendApi.js"
Cohesion: 0.14
Nodes (27): backendUrl(), chooseCoursesByGrade(), choosePaymentPlan(), eligibleForEdit(), getCities(), getCommonScriptVariables(), getMasters(), getParentDetails() (+19 more)

### Community 51 - "FullScreenLoader"
Cohesion: 0.11
Nodes (24): AddEnrollmentStepLoading(), MyClassesGate(), MyClassesPage(), EnrollmentLoading(), StepLoading(), GlobalLoader(), FullScreenLoader(), Loader() (+16 more)

### Community 52 - "useDashboardContext.js"
Cohesion: 0.15
Nodes (26): DashboardProvider(), parseGradeCache(), readGradeCache(), readSearch(), readSearchOnServer(), studentDashboardDetailsQuery(), studentDemoRowQuery(), subscribe() (+18 more)

### Community 53 - "EnrollmentWizardShell.jsx"
Cohesion: 0.14
Nodes (23): AccountCreationForm(), FALLBACK_POLICY_LINKS, FALLBACK_SCHOOL_INFO, AddEnrollmentWizardShell(), LogoMark(), MobileMark(), StepCircle(), StepRow() (+15 more)

### Community 54 - "ProgressReportView.jsx"
Cohesion: 0.15
Nodes (31): ACT_GRID, ACT_GRID_NO_MODULE, CourseReport(), CourseWareCourse(), gradeTone(), K5ProgressReportView(), Kv(), ReportSkeleton() (+23 more)

### Community 55 - "logout.js"
Cohesion: 0.13
Nodes (23): DashboardBody(), DashboardChrome(), DashboardTitle(), isOnboardingPath(), LastPathRecorder(), OnboardingGate(), SessionExpiryWatcher(), ShellForGrade() (+15 more)

### Community 56 - "AccountForm.jsx"
Cohesion: 0.10
Nodes (34): AccountForm(), handleEmailBlur(), handleSubmit(), refreshCaptcha(), setField(), INITIAL_FIELDS, randomCaptcha(), AccountInput() (+26 more)

### Community 57 - "react-hot-toast"
Cohesion: 0.33
Nodes (11): ChangePasswordModal(), PasswordInput(), RULES, DashboardTopHeader(), ChildSwitcher(), ParentHeader(), normalizeWebsite(), SIGNUP_PAGE_TO_STEP (+3 more)

### Community 58 - "backendOrigin.js"
Cohesion: 0.10
Nodes (25): Home(), page(), BackendSwitcher(), apply(), handlePointerMove(), handleReset(), handleSelectChange(), reclamp() (+17 more)

### Community 59 - "AddStage3ReviewPayment.jsx"
Cohesion: 0.05
Nodes (112): AddStage3ReviewPayment(), checkPaidStatus(), confirmAndPay(), confirmSubmitApplication(), flushPaidStatusPoll(), handleFailure(), launchGateway(), openSectionFor() (+104 more)

### Community 60 - "CelebrationHost.jsx"
Cohesion: 0.12
Nodes (25): createBurst(), fivePointStar(), fourPointSparkle(), stepAndDrawBurst(), effects, fitCanvas(), onVisibility(), start() (+17 more)

### Community 61 - "student-enroll/FeePaymentPlans.jsx"
Cohesion: 0.19
Nodes (22): Discounts(), FeeBreakdown(), Lines(), Row(), AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows() (+14 more)

### Community 62 - "StudentHomeK5.jsx"
Cohesion: 0.07
Nodes (80): ChristmasTreeIcon(), INITIAL, isChristmasKey(), listeners, setChristmasPlanner(), CLUES, ColourClues(), PREK_CLUES (+72 more)

### Community 63 - "BookClassSlotModal.jsx"
Cohesion: 0.27
Nodes (11): BookClassSlotModal(), confirmBooking(), K5_CHIP_STYLES, LEGACY_CHIP_STYLES, ModalShell(), BOOKED_CLASS_STATUS_STYLES, getDayHeading(), getSlotEnd() (+3 more)

### Community 64 - "ContactCheckModal.jsx"
Cohesion: 0.17
Nodes (25): contactCheckCopy(), ACTION_ICONS, Buddy(), CHANNEL_ICONS, ChooseStep(), CloseForNow(), CodeStep(), checkTarget() (+17 more)

### Community 65 - "useAppearance"
Cohesion: 0.10
Nodes (41): useAppearance(), AppearanceSettingsPanel(), BuddyNameRow(), Choice(), DayNightSwitch(), DyslexiaSection(), GradeLookSection(), HandChoice() (+33 more)

### Community 66 - "error.jsx"
Cohesion: 0.29
Nodes (13): Error(), ErrorDetails(), ErrorPageFooter(), ErrorPageHeader(), GlobalError(), NotFound(), useSchoolName(), goHomeFromErrorPage() (+5 more)

### Community 67 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 68 - "useInbox.js"
Cohesion: 0.14
Nodes (28): liveInbox, saveBlob(), sentAsItem(), useInbox(), useInboxSource(), acknowledgeInboxAnnouncement(), getComposeContacts(), getComposeTemplates() (+20 more)

### Community 69 - "FeeDetails.jsx"
Cohesion: 0.14
Nodes (17): FeeDetailsPage(), StudentHandbookPage(), TranscriptPage(), feeAction(), FeeDetails(), HEADERS, paymentName(), RETRY_STATUSES (+9 more)

### Community 70 - "ParentProfileDetails.jsx"
Cohesion: 0.17
Nodes (27): ParentPhotoDialog(), Card(), ParentProfileDetails(), photoSrc(), LanguageSelect(), ParentPhoneField(), ViewField(), buildDraft() (+19 more)

### Community 71 - "PaymentResponseView"
Cohesion: 0.14
Nodes (11): EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage(), PaymentResponseSuccessPage(), RegistrationPaymentResponseSuccessPage(), EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage() (+3 more)

### Community 72 - "PicoGuide.jsx"
Cohesion: 0.09
Nodes (36): GET(), PIXEL, classesTourSteps(), coveredByDialog(), FIXED_PINS, isMobileView(), noSubscribe(), onPage() (+28 more)

### Community 73 - "add-enrollment/FeePaymentPlans.jsx"
Cohesion: 0.24
Nodes (18): AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows(), currencyOf(), CustomPlanTable(), describeMonths(), discountRow() (+10 more)

### Community 74 - "profileModel.js"
Cohesion: 0.25
Nodes (19): buildProfileModel(), CUSTOM_TYPES, customFieldsOf(), DIAL_BY_ISO, dialCode(), DOCS, filled(), fullName() (+11 more)

### Community 75 - "AddCreatePassword.jsx"
Cohesion: 0.20
Nodes (14): AddEnrollmentCreatePasswordPage(), metadata, AddCreatePassword(), initials(), PasswordField(), RULES, subscribeNone(), COUNTRIES (+6 more)

### Community 76 - "diaryApi.js"
Cohesion: 0.37
Nodes (12): POST(), reply(), toInt(), getDiaryBadgeVersion(), getDiaryMentionUsers(), getDiaryThreadList(), getDiaryThreadMessages(), getDiaryUnreadCount() (+4 more)

### Community 77 - "k5Bits.jsx"
Cohesion: 0.12
Nodes (21): ChristmasLights(), CLUE_RING, HIGH_ICONS, HighIcon(), highIconKey(), K5_CARD, K5_PRIMARY_BTN, SUBJECT_ICONS (+13 more)

### Community 78 - "ClassFeedbackHost.jsx"
Cohesion: 0.17
Nodes (24): PendingFeedbackPopup(), Stat(), ClassFeedbackHost(), buildEmbedUrl(), buildWebhook(), classDateTimeOf(), dateOf(), delayMsOf() (+16 more)

### Community 79 - "AiAdvisorDialog.jsx"
Cohesion: 0.13
Nodes (18): ACTION_BADGE, BANDS, Chip(), ConsentNote(), formatCredit(), ListProgress(), MarksheetTable(), NO_RETRY_CODES (+10 more)

### Community 80 - "withSmsAuth"
Cohesion: 0.30
Nodes (16): required(), useAdvisorChat(), useAdvisorStart(), useAdvisorSuggestions(), useApplySuggestions(), useConfirmMarksheet(), useDismissSuggestions(), applyAdvisorSuggestions() (+8 more)

### Community 81 - "ParentAttendance.jsx"
Cohesion: 0.25
Nodes (10): Page(), MonthlyChart(), MONTHS, SUMMARY, SummaryChart(), Delta(), Hero(), ParentAttendance() (+2 more)

### Community 82 - "K5NavRail.jsx"
Cohesion: 0.12
Nodes (32): GroupItem(), iconFor(), ICONS, LinkItem(), Sidebar(), CLUB_ART, ClubMark(), flattenItems() (+24 more)

### Community 83 - "K5Attendance.jsx"
Cohesion: 0.11
Nodes (28): AttendancePage(), academicYearMonths(), AttendanceHeader(), AttendanceSkeleton(), badgeOf(), buildMonth(), GOLD, K5Attendance() (+20 more)

### Community 84 - "AiAdvisorDialog"
Cohesion: 0.20
Nodes (12): AiAdvisorDialog(), goToQuestions(), handleApply(), handleAsk(), handleConfirmMarks(), handleFiles(), handleSuggest(), loadStart() (+4 more)

### Community 85 - "package.json"
Cohesion: 0.12
Nodes (19): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@^1.64.1, shadcn@^4.23.0, tailwindcss@^4, @tailwindcss/postcss@^4 (+11 more)

### Community 86 - "sessionState.js"
Cohesion: 0.13
Nodes (23): QueryProvider(), BAND_COPY, BlinkingDots(), Hourglass(), LOOKS, SessionExpiredDialog(), login(), wrongPasswordMessage() (+15 more)

### Community 87 - "AcademicYearExtension.jsx"
Cohesion: 0.17
Nodes (17): AcademicYearExtensionPage(), loadYouTubeApi(), OnboardingVideoModal(), videoIdOf(), AcademicYearExtension(), avail(), openCourse(), buildProceed() (+9 more)

### Community 88 - "K5Performance.jsx"
Cohesion: 0.06
Nodes (99): K5RowsSkeleton(), BehindBanner(), Header(), Hero(), K5Performance(), PerformanceSkeleton(), PILLS, QUIET (+91 more)

### Community 89 - "cartApi.js"
Cohesion: 0.38
Nodes (10): authHeaders(), callBackend(), callDashboard(), createCartPayment(), getBuyExtraClass(), getCartCount(), getCartDetails(), getSchoolCurrency() (+2 more)

### Community 90 - "verifyAccountAuth.mjs"
Cohesion: 0.16
Nodes (13): at, b64(), check(), held, jar, other, { privateKey, publicKey }, rejects() (+5 more)

### Community 91 - "BookedClasses.jsx"
Cohesion: 0.14
Nodes (18): BookClassesPage(), AllCoursesPickerModal(), BookClasses(), Count(), Notice(), PageTitle(), BookedClasses(), COLUMNS (+10 more)

### Community 92 - "ForcedPasswordChange.jsx"
Cohesion: 0.38
Nodes (8): dayKey(), ForcedPasswordChange(), readDay(), storageKey(), writeDay(), K5ChangePasswordModal(), K5PasswordInput(), RULES

### Community 93 - "OnboardingSetup.jsx"
Cohesion: 0.06
Nodes (79): SetupPage(), K5SystemTrainingRescheduleDialog(), otherPopupOpen(), planFor(), rememberWelcome(), salsa, SystemTrainingPopup(), welcomeKey() (+71 more)

### Community 94 - "AnnouncementDetailModal.jsx"
Cohesion: 0.27
Nodes (13): AnnouncementDetailModal(), formatAnnouncementDate(), AnnouncementsPanel(), formatRelativeAgo(), AnnouncementsWidget(), AttachmentPreviewDialog(), K5AnnouncementDetailModal(), K5AnnouncementsPanel() (+5 more)

### Community 95 - "useContactCheck.js"
Cohesion: 0.20
Nodes (21): farewellShown, flowFor(), flows, IDLE, idleState(), readPage(), useContactCheck(), buildApi() (+13 more)

### Community 96 - "K5Shell.jsx"
Cohesion: 0.15
Nodes (22): GAP, paw(), PointerTrail(), spark(), star(), ReadingRuler(), MusicDisc(), ChristmasBanner() (+14 more)

### Community 97 - "dummyStudent.js"
Cohesion: 0.13
Nodes (22): ACTIVITY_ROWS, ASSIGNMENT_KINDS, cleanCourseName(), courseCategoryForName(), assignedTeachers(), ownCourse(), saveReceipt(), subjects() (+14 more)

### Community 98 - "student-enroll/PaymentGatewayPickerModal.jsx"
Cohesion: 0.12
Nodes (32): assetUrl(), CardTiles(), CurrencyCard(), Flag(), GatewayActions(), GatewayPanel(), MethodTile(), NO_PAY_BUTTON (+24 more)

### Community 99 - "k5Fonts.js"
Cohesion: 0.18
Nodes (10): AppearanceContext, andika, atkinson, dmSans, fredoka, k5FontVariables, lexend, nunito (+2 more)

### Community 100 - "scheduleRows.js"
Cohesion: 0.11
Nodes (35): Page(), Page(), clockText(), ParentClassSchedule(), SelectedChildClassSchedule(), apiRange(), attendanceOf(), countByCategory() (+27 more)

### Community 101 - "parentDashboardApi.js"
Cohesion: 0.44
Nodes (7): parentGateQuery(), useParentGate(), authHeaders(), getParentChildSchedule(), getParentGate(), parseJsonResponse(), postParent()

### Community 102 - "K5AssignedTeacher.jsx"
Cohesion: 0.28
Nodes (11): SyllabusPage(), ClassTeacherChip(), classTeacherOf(), initials(), K5AssignedTeacher(), Syllabus(), useStudentAssignedTeacher(), key() (+3 more)

### Community 103 - "Image Optimization and Next.js Image Component Rules"
Cohesion: 0.18
Nodes (10): 1. Prefer Next.js Image Component, 2. Image Dimensions and Layout, 3. External and Dynamic Images, 4. Loading and Performance, 5. Special Cases, 6. Mandatory Development Workflow, 7. Preserve Existing Functionality, 8. Project-Wide Enforcement (+2 more)

### Community 104 - "useIntlTelInput"
Cohesion: 0.23
Nodes (7): PhoneNumberField(), decorateFullscreenPopup(), useIntlTelInput(), handleOpenSelector(), intl-tel-input, getIpLocation(), getDefaultCountryCode()

### Community 105 - "K5BookedView.jsx"
Cohesion: 0.11
Nodes (22): COLUMNS, COLUMNS_MIDDLE, COUNT_KEYS, DATE_TYPES, DATE_TYPES_MIDDLE, DEFAULT_FILTER, initialsOf(), K5BookedView() (+14 more)

### Community 106 - "AI Course Advisor — Implementation Plan"
Cohesion: 0.10
Nodes (19): 10. Data audit results (staging, 2026-10-09), 1. Ground rules, 2. Settings (`Settings`, type `CONFIGURATION`), 3. When the AI Suggester shows, 4. Student flow, 5. Server API (`is-rest-api`), 7. Frontend (`is-sms`), render only, 8. Phases (+11 more)

### Community 107 - "useStudentProfile.js"
Cohesion: 0.20
Nodes (14): MyProfilePage(), MyProfile(), useProfileOtp(), useStudentProfile(), getMyProfile(), idOf(), loadPlaceNames(), loadWithdrawalEligibility() (+6 more)

### Community 108 - "bookClassApi.js"
Cohesion: 0.20
Nodes (25): POST(), reply(), useBookSlots(), authHeaders(), callBackend(), cancelStudentClass(), getAssignedTeacherForCourse(), getAssignedTeachersForAllCourses() (+17 more)

### Community 109 - "ParentAppInstallPrompt.jsx"
Cohesion: 0.17
Nodes (17): ParentMyProfilePage(), detectDevice(), dismiss(), dismissKey(), FEATURES, isDismissed(), isInstalledApp(), noopSubscribe() (+9 more)

### Community 110 - "DemandBookPanel.jsx"
Cohesion: 0.22
Nodes (16): bookIt(), DemandBookModal(), dayParts(), DemandBookPanel(), ask(), confirm(), LOOK, linkDemandBooking() (+8 more)

### Community 111 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, verify:account-auth, verify:contact-check, verify:cookie-domain (+3 more)

### Community 112 - "useStudentDashboardData"
Cohesion: 0.22
Nodes (14): StudentHomePage(), StudentHome(), ContactCheckModal, StudentHomeForGrade(), CompleteProfileModal(), empty(), FieldLine(), label() (+6 more)

### Community 113 - "useSpeech"
Cohesion: 0.21
Nodes (19): BuddyStrip(), SelectToSpeak(), hasSpeech(), noSubscribe(), useSpeech(), voiceOf(), askBackend(), clean() (+11 more)

### Community 114 - "parentPost"
Cohesion: 0.11
Nodes (31): DOC_KINDS, fetchRawAcademicDocs(), rawRows(), rowKeyOf(), fail(), POST(), POST(), reply() (+23 more)

### Community 115 - "ReEnrollmentOptions.jsx"
Cohesion: 0.18
Nodes (15): ReEnrollmentPage(), K5PassedOptions(), Offer(), DiscountBanner(), HelpCard(), OPTION_BUTTON, pad(), ProgramChips() (+7 more)

### Community 116 - "AI Course Advisor — Rollout Runbook (Phase 6)"
Cohesion: 0.29
Nodes (6): 1. Deploy (once), 2. Live AI check (before switching anything on), 3. Who sees it, 4. Smoke test per stage (about 10 minutes), 5. Metrics (read-only SQL), AI Course Advisor — Rollout Runbook (Phase 6)

### Community 117 - "paymentResponseApi.js"
Cohesion: 0.54
Nodes (7): backendUrl(), buildQuery(), getJson(), getPaymentResponseFailure(), getPaymentResponseSuccess(), getPaymentSettlementStatus(), SUCCESS_ENDPOINTS

### Community 118 - "dashboardNav.js"
Cohesion: 0.29
Nodes (10): deriveSegment(), HOME_PAGE_LINKS, iconForLabel(), isActiveModule(), mapBackendMenu(), mapRights(), PARENT_HIDDEN_SEGMENTS, resolveSegment() (+2 more)

### Community 119 - "prepareMarksheetFiles"
Cohesion: 0.53
Nodes (5): downscale(), IMAGE_TYPES, isImage(), isPdf(), prepareMarksheetFiles()

### Community 120 - "verifyContactCheckFlow.mjs"
Cohesion: 0.11
Nodes (18): EMAIL, MOBILE, ok(), opened(), setup(), WHATSAPP, CONTACT_CHECK_ORDER, createContactCheckFlow() (+10 more)

### Community 123 - "devApiLog.js"
Cohesion: 0.30
Nodes (8): dynamic, GET(), installDevApiTiming(), register(), devApiEntriesAfter(), recordDevApiCall(), store(), subscribeDevApiLog()

### Community 132 - "RightActionRail.jsx"
Cohesion: 0.21
Nodes (14): K5RailButton(), DUR, EASE_OUT, SPRING, STAGGER, ZOOM, MotionContext, MotionProvider() (+6 more)

### Community 133 - "ChristmasProvider.jsx"
Cohesion: 0.19
Nodes (15): bell(), dropUnlock(), jingle(), schedule(), SONG, startChristmasMusic(), stopChristmasMusic(), ChristmasContext (+7 more)

### Community 134 - "dummyInbox.js"
Cohesion: 0.14
Nodes (17): fresh(), BANDS, buildMessages(), CATEGORY, CHANNEL, contactsOf(), getDummyInbox(), OFFICE (+9 more)

### Community 135 - "K5Profile.jsx"
Cohesion: 0.16
Nodes (23): K5PhotoDialog(), AcademicSection(), Avatar(), Chip(), Field(), FloatingField(), K5Profile(), Mark() (+15 more)

### Community 137 - "learningProgramTheme.js"
Cohesion: 0.20
Nodes (14): EnrollRedirect(), decodePayload(), EnrollPage(), getFirstValue(), PageTitle(), findLearningProgram(), getLearningProgramLabel(), getLearningProgramRouteCode() (+6 more)

### Community 138 - "picoEvents.js"
Cohesion: 0.24
Nodes (13): BreakDialog(), Cloud(), Footprints(), Glass(), K5BrainBreak(), Shoe(), Star(), Tick() (+5 more)

### Community 139 - "K5InboxCompose.jsx"
Cohesion: 0.25
Nodes (13): K5InboxCompose(), Recipients(), InboxCompose(), Recipients(), EMAIL_SETTINGS_ALWAYS, EMAIL_SETTINGS_INTRO, FILE_ACCEPT, FILE_HELP (+5 more)

### Community 140 - "lucide-react"
Cohesion: 0.14
Nodes (30): ChildWithdrawal(), Policy(), ReadOnly(), BankForm(), BankSummary(), Note(), ParentWithdrawalRequest(), StatusBadge() (+22 more)

### Community 141 - "K5Toolbar.jsx"
Cohesion: 0.15
Nodes (20): K5_ROUND_BTN, K5ClockIcon(), greeting(), K5Toolbar(), titles(), VIEWS, zoneLabel(), DROPS (+12 more)

### Community 142 - "AppDownloadDialog.jsx"
Cohesion: 0.19
Nodes (14): AppInstallPrompt(), dismissedUntilNow(), rememberDismissed(), runsAsInstalledApp(), storageKey(), subscribeNothing(), AppDownloadDialog(), DancingPhone() (+6 more)

### Community 143 - "D3 — Transcript: Diploma link and "(New)" label"
Cohesion: 0.15
Nodes (12): Backend change (additive, one method), D2 and D3 — backend plan (2026-11-14), D2 — Canvas and Courseware report bodies, D3 — Transcript: Diploma link and "(New)" label, Decision (2026-11-14, user), Done, Finding, Frontend (after the backend ships) (+4 more)

### Community 144 - "ReserveSeatForNextGrade.jsx"
Cohesion: 0.15
Nodes (22): Credential(), OutlookReminder(), acceptText(), EnrollReserveDialog(), hasAmount(), helpPicture(), NeedHelpPanel(), OfferCountdown() (+14 more)

### Community 145 - "RightActionRail.jsx"
Cohesion: 0.24
Nodes (14): ParentRailItem(), RAIL_OPEN_EVENT, RailButton(), RightActionRailContent(), pollers, startPoller(), poll(), useDiaryLivePolling() (+6 more)

### Community 146 - "baseDate"
Cohesion: 0.31
Nodes (16): backendDate(), academicGradeHistory(), academicPerformanceRows(), academicPerformanceView(), academicProgressDetail(), attendanceFull(), baseDate(), extraClassSubjects() (+8 more)

### Community 147 - "classesForDay"
Cohesion: 0.28
Nodes (15): activitySchedule(), assignmentCourses(), assignmentsForDay(), bookedClasses(), businessDayIndex(), calendar(), calendarCourses(), classesForDay() (+7 more)

### Community 148 - "PaymentInProgressModal.jsx"
Cohesion: 0.30
Nodes (12): continueHref(), devicePhrase(), expiryLine(), formatDay(), formatTime(), Option(), parseInstant(), PaymentInProgressModal() (+4 more)

### Community 149 - "OnboardingWelcome.jsx"
Cohesion: 0.35
Nodes (9): WelcomePage(), CheckoutExtraDialogs(), OnboardingWelcome(), OverdueStep(), Row(), TimezoneStep(), welcomeKey(), SupportCard() (+1 more)

### Community 150 - "ClassSummarySheet.jsx"
Cohesion: 0.20
Nodes (13): ChildAvatar(), eventMeta(), ClassSummarySheet(), Fact(), Sheet(), SheetContent(), SheetDescription(), SheetFooter() (+5 more)

### Community 151 - "AppearanceProvider.jsx"
Cohesion: 0.24
Nodes (8): AppearanceProvider(), HAND_HINT_KEY, parseSaved(), readStorage(), subscribeDark, subscribeReduced, subscribeStorage(), DEFAULT_POLICY

### Community 152 - "K5Select.jsx"
Cohesion: 0.27
Nodes (15): flat(), K5Select(), List(), Rows(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel() (+7 more)

### Community 153 - "Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)"
Cohesion: 0.20
Nodes (9): 1. Project in one paragraph, 2. Rules the user set (follow them always), 3. How things are wired (quick map), 4. Status — what is DONE (all committed by the user, up to is-sms "Student New Dashboard Part 31"), 5. NOT verified because the Java backend (8080) was down — do these first once it runs, 6. What is LEFT (not code-blocked), 7. Testing how-to, 8. Open decisions / things to ask the user (+1 more)

### Community 154 - "ChildPicker.jsx"
Cohesion: 0.13
Nodes (21): PermissionGate(), useHasPermission(), gradeLabel(), ArrowIcon(), CapIcon(), ChildCard(), ChildPicker(), EnrollMoreBox() (+13 more)

### Community 155 - "K5LiveClassWatcher.jsx"
Cohesion: 0.33
Nodes (8): noSubscribe(), readSession(), Watcher(), LiveClassAlert(), startedAgo(), picoSay(), setPicoLive(), LIVE_ALERT_KEY

### Community 156 - "K5Header.jsx"
Cohesion: 0.33
Nodes (9): HeaderAvatar(), K5Header(), MenuItem(), MoreItem(), Ghost(), K5LogoutDialog(), LogoutCard(), SAY (+1 more)

### Community 157 - "ShapeLayer.js"
Cohesion: 0.53
Nodes (5): cloud(), createShapes(), pickKind(), star(), stepAndDrawShapes()

### Community 158 - "K5Extension.jsx"
Cohesion: 0.38
Nodes (10): CourseTile(), describe(), DetailView(), ExtensionHeader(), ExtensionSkeleton(), K5Extension(), ListView(), useCourseColor() (+2 more)

### Community 159 - "AccountSetupSection.jsx"
Cohesion: 0.42
Nodes (7): AccountSetupSection(), CredRow(), OutlookCredentials(), Step(), cache, createPasswordPath(), saveCreatePasswordTarget()

### Community 160 - "K5CompleteProfileModal.jsx"
Cohesion: 0.44
Nodes (7): fieldLabel(), isMissing(), K5CompleteProfileModal(), SectionBlock(), fetchProfileCompleting(), useProfileCompletingProcess(), afterStartup()

### Community 161 - "login-credentials/route.js"
Cohesion: 0.60
Nodes (4): COOKIE_DOMAINS, encodeCookieValue(), POST(), sharedCookieDomain()

### Community 163 - "K5Transcript.jsx"
Cohesion: 0.42
Nodes (7): K5TableSkeleton(), COLUMNS, DownloadButton(), K5Transcript(), downloadTranscriptDocument(), isDownloadableTranscriptLink(), newToken()

### Community 164 - "5. Progress"
Cohesion: 0.17
Nodes (11): 1. How the file is built, 2. How dummy mode turns on (legacy), 3. Every public export → legacy caller → Next.js target, 4. Implementation plan (Next.js), Dummy (demo) student mode — legacy analysis and Next.js plan, Not needed for the student dashboard, Phase 0 — foundation (blocks everything else), Phase 1 — modules built in this session (small, self-contained) (+3 more)

### Community 165 - "ExamDetails.jsx"
Cohesion: 0.60
Nodes (3): ExamDetailsPage(), ExamDetails(), useStudentExaminationDetails()

### Community 166 - "verifyPaymentAttemptRecovery.mjs"
Cohesion: 0.40
Nodes (4): alreadyPaid, attempt, otherBrowser, unavailable

### Community 174 - "useContactSummary.js"
Cohesion: 0.28
Nodes (8): CHANNELS, ContactCheckModal, ContactSummaryCard(), STATUS, TONE, needsAttention(), useContactSummary(), problemsOf()

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `EnrollmentWizardShell.jsx` to `AddParentDetails.jsx`, `K5BookView.jsx`, `VideoLibrary.jsx`, `marketingConsent.js`, `expireSession`, `Stage3CourseSelection.jsx`, `k5Calendar.js`, `useAddEnrollmentContext.js`, `ClubPage`, `add-enrollment/ReviewInlineEdit.jsx`, `CalendarCard.jsx`, `K5AttendanceDetails.jsx`, `profileEdit.js`, `parentHome.js`, `K5Loading`, `Cart.jsx`, `useSelectedChild`, `react`, `PaymentResponseView.jsx`, `useDummyStudent`, `hasBackendOrigin`, `K5ProfileEditors.jsx`, `K5DiaryPanel.jsx`, `ParentProgressReports.jsx`, `Inbox.jsx`, `K5ProfileCustomFields.jsx`, `DialogContent`, `FeeDetails.jsx`, `backendRequest`, `MyCertificates.jsx`, `react`, `package.json`, `DatePicker`, `inbox.js`, `Button`, `PaymentGatewayInitView.jsx`, `useStudentCalendar.js`, `useEnrollmentContext.js`, `ParentAcademicPerformance.jsx`, `callServer`, `K5Games.jsx`, `EventDetailModal.jsx`, `K5NewsPanel.jsx`, `FullScreenLoader`, `useDashboardContext.js`, `ProgressReportView.jsx`, `logout.js`, `AccountForm.jsx`, `react-hot-toast`, `backendOrigin.js`, `AddStage3ReviewPayment.jsx`, `CelebrationHost.jsx`, `student-enroll/FeePaymentPlans.jsx`, `StudentHomeK5.jsx`, `BookClassSlotModal.jsx`, `ContactCheckModal.jsx`, `useAppearance`, `error.jsx`, `useInbox.js`, `FeeDetails.jsx`, `ParentProfileDetails.jsx`, `PicoGuide.jsx`, `add-enrollment/FeePaymentPlans.jsx`, `AddCreatePassword.jsx`, `k5Bits.jsx`, `ClassFeedbackHost.jsx`, `AiAdvisorDialog.jsx`, `K5NavRail.jsx`, `K5Attendance.jsx`, `package.json`, `sessionState.js`, `AcademicYearExtension.jsx`, `K5Performance.jsx`, `BookedClasses.jsx`, `ForcedPasswordChange.jsx`, `OnboardingSetup.jsx`, `AnnouncementDetailModal.jsx`, `useContactCheck.js`, `K5Shell.jsx`, `student-enroll/PaymentGatewayPickerModal.jsx`, `k5Fonts.js`, `scheduleRows.js`, `K5AssignedTeacher.jsx`, `useIntlTelInput`, `K5BookedView.jsx`, `useStudentProfile.js`, `ParentAppInstallPrompt.jsx`, `DemandBookPanel.jsx`, `useStudentDashboardData`, `useSpeech`, `parentPost`, `ReEnrollmentOptions.jsx`, `RightActionRail.jsx`, `ChristmasProvider.jsx`, `K5Profile.jsx`, `learningProgramTheme.js`, `picoEvents.js`, `K5InboxCompose.jsx`, `lucide-react`, `K5Toolbar.jsx`, `AppDownloadDialog.jsx`, `ReserveSeatForNextGrade.jsx`, `RightActionRail.jsx`, `PaymentInProgressModal.jsx`, `OnboardingWelcome.jsx`, `ClassSummarySheet.jsx`, `AppearanceProvider.jsx`, `K5Select.jsx`, `ChildPicker.jsx`, `K5LiveClassWatcher.jsx`, `K5Header.jsx`, `AccountSetupSection.jsx`, `K5CompleteProfileModal.jsx`, `K5Transcript.jsx`, `useContactSummary.js`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useDummyStudent()` (e.g. with `Phase 0 — foundation (blocks everything else)` and `readSearch()`) actually correct?**
  _`useDummyStudent()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `AddParentDetails.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11510204081632654 - nodes in this community are weakly interconnected._
- **Why does `useDashboardContext()` connect `ChildPicker.jsx` to `K5BookView.jsx`, `VideoLibrary.jsx`, `RightActionRail.jsx`, `ChristmasProvider.jsx`, `k5Calendar.js`, `picoEvents.js`, `ClubPage`, `lucide-react`, `AppDownloadDialog.jsx`, `K5AttendanceDetails.jsx`, `ReserveSeatForNextGrade.jsx`, `K5Loading`, `Cart.jsx`, `useSelectedChild`, `parentHome.js`, `OnboardingWelcome.jsx`, `useDummyStudent`, `hasBackendOrigin`, `K5ProfileEditors.jsx`, `K5DiaryPanel.jsx`, `K5LiveClassWatcher.jsx`, `K5Header.jsx`, `Inbox.jsx`, `DialogContent`, `K5Extension.jsx`, `ParentProgressReports.jsx`, `MyCertificates.jsx`, `FeeDetails.jsx`, `K5Transcript.jsx`, `K5CompleteProfileModal.jsx`, `ExamDetails.jsx`, `dashboardBootstrap.js`, `useStudentCalendar.js`, `ParentAcademicPerformance.jsx`, `useContactSummary.js`, `EventDetailModal.jsx`, `FullScreenLoader`, `useDashboardContext.js`, `ProgressReportView.jsx`, `logout.js`, `react-hot-toast`, `StudentHomeK5.jsx`, `BookClassSlotModal.jsx`, `ContactCheckModal.jsx`, `useAppearance`, `useInbox.js`, `FeeDetails.jsx`, `ParentProfileDetails.jsx`, `PicoGuide.jsx`, `k5Bits.jsx`, `ClassFeedbackHost.jsx`, `K5NavRail.jsx`, `K5Attendance.jsx`, `sessionState.js`, `AcademicYearExtension.jsx`, `K5Performance.jsx`, `BookedClasses.jsx`, `ForcedPasswordChange.jsx`, `OnboardingSetup.jsx`, `useContactCheck.js`, `K5Shell.jsx`, `k5Fonts.js`, `scheduleRows.js`, `K5AssignedTeacher.jsx`, `K5BookedView.jsx`, `useStudentProfile.js`, `ParentAppInstallPrompt.jsx`, `useStudentDashboardData`, `parentPost`, `ReEnrollmentOptions.jsx`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Should `withSmsAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Cart.jsx` to `AddParentDetails.jsx`, `K5BookView.jsx`, `VideoLibrary.jsx`, `session.js`, `expireSession`, `Stage3CourseSelection.jsx`, `k5Calendar.js`, `ClubPage`, `add-enrollment/ReviewInlineEdit.jsx`, `CalendarCard.jsx`, `K5AttendanceDetails.jsx`, `K5Loading`, `PaymentResponseView.jsx`, `K5ProfileEditors.jsx`, `K5DiaryPanel.jsx`, `ParentProgressReports.jsx`, `Inbox.jsx`, `K5ProfileCustomFields.jsx`, `DialogContent`, `FeeDetails.jsx`, `MyCertificates.jsx`, `react`, `package.json`, `DatePicker`, `Button`, `PaymentGatewayInitView.jsx`, `callServer`, `K5Games.jsx`, `EventDetailModal.jsx`, `K5NewsPanel.jsx`, `FullScreenLoader`, `EnrollmentWizardShell.jsx`, `ProgressReportView.jsx`, `AccountForm.jsx`, `react-hot-toast`, `backendOrigin.js`, `AddStage3ReviewPayment.jsx`, `student-enroll/FeePaymentPlans.jsx`, `StudentHomeK5.jsx`, `BookClassSlotModal.jsx`, `ContactCheckModal.jsx`, `useAppearance`, `FeeDetails.jsx`, `ParentProfileDetails.jsx`, `PicoGuide.jsx`, `add-enrollment/FeePaymentPlans.jsx`, `AddCreatePassword.jsx`, `k5Bits.jsx`, `ClassFeedbackHost.jsx`, `AiAdvisorDialog.jsx`, `K5NavRail.jsx`, `K5Attendance.jsx`, `package.json`, `sessionState.js`, `AcademicYearExtension.jsx`, `K5Performance.jsx`, `BookedClasses.jsx`, `ForcedPasswordChange.jsx`, `OnboardingSetup.jsx`, `AnnouncementDetailModal.jsx`, `K5Shell.jsx`, `student-enroll/PaymentGatewayPickerModal.jsx`, `K5AssignedTeacher.jsx`, `K5BookedView.jsx`, `ParentAppInstallPrompt.jsx`, `DemandBookPanel.jsx`, `useStudentDashboardData`, `useSpeech`, `ReEnrollmentOptions.jsx`, `K5Profile.jsx`, `picoEvents.js`, `K5InboxCompose.jsx`, `lucide-react`, `K5Toolbar.jsx`, `AppDownloadDialog.jsx`, `ReserveSeatForNextGrade.jsx`, `RightActionRail.jsx`, `PaymentInProgressModal.jsx`, `OnboardingWelcome.jsx`, `ClassSummarySheet.jsx`, `K5Select.jsx`, `ChildPicker.jsx`, `K5Header.jsx`, `K5Extension.jsx`, `AccountSetupSection.jsx`, `K5CompleteProfileModal.jsx`, `K5Transcript.jsx`, `ExamDetails.jsx`, `useContactSummary.js`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `K5BookView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11201079622132254 - nodes in this community are weakly interconnected._