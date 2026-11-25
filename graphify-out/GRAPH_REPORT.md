# Graph Report - is-sms  (2026-11-24)

## Corpus Check
- 664 files · ~541,304 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .css 10, .otf 4, (none) 3)

## Summary
- 4367 nodes · 15822 edges · 170 communities (156 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 208 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `349929b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- k5PerformanceData.js
- studentSignupBackendApi.js
- Stage3CourseSelection
- calendarEvents.js
- VideoLibrary.jsx
- useReEnrollment.js
- createDummyStudent
- PaymentResponseView.jsx
- K5BookedView.jsx
- AddStage2CourseSelection
- DialogContent
- K5Shell.jsx
- usePicoContentReady
- session.js
- K5DiaryPanel.jsx
- backendRequest
- ContactCheckModal.jsx
- k5Bits.jsx
- ClubPage
- AccountForm.jsx
- next
- reEnrollmentDocuments.js
- backendOrigin.js
- hasBackendOrigin
- Inbox.jsx
- inbox.js
- FullScreenLoader
- react
- floating-label-select.jsx
- PicoGuide.jsx
- MyCertificates.jsx
- useDummyStudent
- K5ProfileEditors.jsx
- K5ProfileCustomFields.jsx
- useReEnrollment.js
- CelebrationHost.jsx
- profileEdit.js
- calendarEvents.js
- K5AttendanceDetails.jsx
- K5ProgressReportView.jsx
- AddStage3ReviewPayment.jsx
- add-enrollment/PaymentGatewayPickerModal.jsx
- useStudentDashboardData
- K5PerformanceIcons.jsx
- useDashboardContext.js
- lucide-react
- OnboardingSetup.jsx
- K5BookView.jsx
- K5Dashboard.jsx
- payloadEncoding.js
- useAddEnrollmentContext.js
- EnrollmentWizardShell.jsx
- useContactCheck.js
- useStudentCart.js
- BookClasses.jsx
- useInbox.js
- K5Cart.jsx
- ClassFeedbackHost.jsx
- K5Games.jsx
- useCourseSelection.js
- useParentDetailsSignup.js
- AppearanceSettingsPanel.jsx
- error.jsx
- Cart.jsx
- k5Calendar.js
- K5Shell.jsx
- student-enroll/FeePaymentPlans.jsx
- withSmsAuth
- K5ProfileP5.jsx
- add-enrollment/ReviewInlineEdit.jsx
- components.json
- K5DashCards.jsx
- K5Profile.jsx
- dummyInbox.js
- PaymentGatewayInitView.jsx
- K5InboxCompose.jsx
- K5NavRail.jsx
- PaymentResponseView
- useSpeech.js
- dashboardNav.js
- add-enrollment/FeePaymentPlans.jsx
- K5ProgressReports.jsx
- courseAdvisorApi.js
- profileModel.js
- ReEnrollmentOptions.jsx
- onboardingGateApi.js
- K5Attendance.jsx
- useOnboardingGate.js
- dependencies
- AiAdvisorDialog.jsx
- AI Course Advisor — Implementation Plan
- ChristmasProvider.jsx
- Transcript.jsx
- SystemTrainingPopup.jsx
- Stage3CourseSelection.jsx
- AiAdvisorDialog
- Re-enrollment — "Download your transcript" card: full handoff
- devDependencies
- K5Performance.jsx
- verifyAccountAuth.mjs
- diaryApi.js
- K5PerformanceCompare.jsx
- K5PerformanceCourseView.jsx
- K5Toolbar.jsx
- DashboardChrome.jsx
- D3 — Transcript: Diploma link and "(New)" label
- profileOtpApi.js
- sheet.jsx
- StudentHomeK5.jsx
- Image Optimization and Next.js Image Component Rules
- scripts
- AddStage2CourseSelection.jsx
- FullScreenLoader
- layout.js
- Tooltip
- verifyContactCheckFlow.mjs
- AcademicYearExtension.jsx
- AI Course Advisor — Rollout Runbook (Phase 6)
- paymentResponseApi.js
- AddCreatePassword.jsx
- prepareMarksheetFiles
- locationFinder.js
- login-credentials/route.js
- LoginHistory.jsx
- AGENTS.md
- eslint.config.mjs
- instrumentation.js
- compilerOptions
- serverApi.js
- vercel.json
- LocationConstant.js
- postcss.config.mjs
- useDashboardContext
- ReserveSeatForNextGrade.jsx
- add-enrollment/PaymentGatewayPickerModal.jsx
- sessionState.js
- k5Bits.jsx
- K5ClassesHeader.jsx
- 8. Phases
- K5BrainBreak.jsx
- EventDetailModal.jsx
- AnnouncementDetailModal.jsx
- K5LiveClassWatcher.jsx
- ShapeLayer.js
- ref_node_assert
- Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)
- DocumentUploadPanel.jsx
- qrcode.react
- profileApi.js
- K5Transcript.jsx
- CompleteProfileModal.jsx
- AccountSetupSection.jsx
- marketingConsent.js
- useK5ThemeProps.js
- K5ProfileEditorsP3.jsx
- RightActionRail.jsx
- TranscriptDownloadCard.jsx
- TranscriptBlockedNotice.jsx
- logout.js
- K5LoginHistory.jsx
- ExamDetails.jsx
- verifyPaymentAttemptRecovery.mjs
- StudentHandbook.jsx
- class-variance-authority
- FeeDetails.jsx
- shadcn@^4.21.0
- react-apexcharts
- package.json

## God Nodes (most connected - your core abstractions)
1. `useDashboardContext()` - 263 edges
2. `react` - 255 edges
3. `lucide-react` - 172 edges
4. `useDummyStudent()` - 145 edges
5. `next` - 123 edges
6. `hasBackendOrigin()` - 121 edges
7. `DialogContent()` - 111 edges
8. `Dialog()` - 108 edges
9. `DialogTitle()` - 107 edges
10. `@tanstack/react-query` - 91 edges

## Surprising Connections (you probably didn't know these)
- `Backend` --references--> `useModuleRights()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → hooks/useModuleRights.js
- `Finding` --references--> `useProgressReport()`  [INFERRED]
  docs/migration/d2_d3_backend_plan_2026-11-14.md → components/student/ProgressReportView.jsx
- `9. Phases` --references--> `useCartCheckout()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → hooks/useCartCheckout.js
- `Phase 4 — transactional flows` --references--> `showDummyStripeCheckoutPage()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → utils/paymentGatewayChecks.js
- `Frontend` --references--> `CheckoutExtraDialogs()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → components/common/CheckoutExtraDialogs.jsx

## Import Cycles
- 2-file cycle: `components/k5/pages/K5ProfileEditors.jsx -> components/k5/pages/K5ProfileEditorsP3.jsx -> components/k5/pages/K5ProfileEditors.jsx`

## Communities (170 total, 14 thin omitted)

### Community 0 - "k5PerformanceData.js"
Cohesion: 0.17
Nodes (25): addDays(), daysBetween(), daysTo(), fmtDay(), fmtShort(), fmtWeekday(), GOAL_SCORES, isoTime() (+17 more)

### Community 1 - "studentSignupBackendApi.js"
Cohesion: 0.07
Nodes (50): PageTitle(), AccountFormOfflineB2B(), handleSubmit(), INITIAL_FIELDS, LEARNING_PROGRAMS, findLearningProgram(), getLearningProgramLabel(), getLearningProgramsForSelect() (+42 more)

### Community 2 - "Stage3CourseSelection"
Cohesion: 0.19
Nodes (18): isSuccessResponse(), Stage3CourseSelection(), addSubject(), applyChange(), ask(), confirmRecommended(), handleFailure(), handleGradeChange() (+10 more)

### Community 3 - "calendarEvents.js"
Cohesion: 0.09
Nodes (40): isJoinableClass(), StudentCalendarCard(), titleFor(), VIEW_TABS, CalendarClockPill(), getTimeOfDay(), TIME_OF_DAY_STYLE, CalendarDatepicker() (+32 more)

### Community 4 - "VideoLibrary.jsx"
Cohesion: 0.08
Nodes (73): VideoLibraryPage(), AccessBar(), CourseChips(), K5VideoLibrary(), ModuleHeading(), Row(), Stage(), tint() (+65 more)

### Community 5 - "useReEnrollment.js"
Cohesion: 0.10
Nodes (43): ReEnrollmentCourseSelectionPage(), ReEnrollmentLayout(), ReEnrollmentPaymentPage(), Frame(), ReEnrollmentChrome(), useCustomPlanWatch(), ReEnrollmentReviewPage(), ReEnrollmentCourseSelection() (+35 more)

### Community 6 - "createDummyStudent"
Cohesion: 0.06
Nodes (83): 1. How the file is built, 2. How dummy mode turns on (legacy), 4. Implementation plan (Next.js), Dummy (demo) student mode — legacy analysis and Next.js plan, Phase 0 — foundation (blocks everything else), Phase 1 — modules built in this session (small, self-contained), Phase 2 — other migrated modules, Phase 3 — home + right rail (+75 more)

### Community 7 - "PaymentResponseView.jsx"
Cohesion: 0.11
Nodes (44): AccountInfoCard(), AddEnrollmentAccountInfo(), AddEnrollmentThankYouReplay(), buildRedirectHref(), CircularCountdown(), ConfirmingCard(), ContactEmail(), DASHBOARD_OR_REVIEW_TYPES (+36 more)

### Community 8 - "K5BookedView.jsx"
Cohesion: 0.07
Nodes (33): COLUMNS, COLUMNS_MIDDLE, COUNT_KEYS, DATE_TYPES, DATE_TYPES_MIDDLE, DEFAULT_FILTER, initialsOf(), K5BookedView() (+25 more)

### Community 9 - "AddStage2CourseSelection"
Cohesion: 0.18
Nodes (17): AddStage2CourseSelection(), addSubject(), applyChange(), ask(), confirmRecommended(), handleAiApplied(), handleFailure(), handleGradeChange() (+9 more)

### Community 10 - "DialogContent"
Cohesion: 0.06
Nodes (76): CourseCategoryDialog(), ConfirmDialog(), FlaggedSeatsModal(), InfoModal(), LogoutConfirmDialog(), RecommendedCoursesDialog(), EditCard(), CheckoutExtraDialogs() (+68 more)

### Community 11 - "K5Shell.jsx"
Cohesion: 0.17
Nodes (19): ReadingRuler(), RightActionRail(), MusicDisc(), ChristmasBanner(), ChristmasSky(), ChristmasToast(), FLAKES, useChristmas() (+11 more)

### Community 12 - "usePicoContentReady"
Cohesion: 0.10
Nodes (39): K5_CARD, K5BlockSkeleton(), K5CardsSkeleton(), K5HomeLeftSkeleton(), K5Loading(), K5PlanSkeleton(), K5ProfileSkeleton(), activitiesFor() (+31 more)

### Community 13 - "session.js"
Cohesion: 0.09
Nodes (56): GET(), POST(), GET(), safeReturn(), GET, handleSsoHandoff(), POST, redirectTo() (+48 more)

### Community 14 - "K5DiaryPanel.jsx"
Cohesion: 0.13
Nodes (46): DiaryAvatar(), DiaryLoadError(), DiaryMessageText(), FloatingDateChip(), DiaryEntryCard(), DiaryPanel(), DiarySkeleton(), formatWhen() (+38 more)

### Community 15 - "backendRequest"
Cohesion: 0.12
Nodes (43): POST(), reply(), TYPES, postDocuments(), useProfileActions(), getStudentAttendanceDetails(), addActivity(), addClassTime() (+35 more)

### Community 16 - "ContactCheckModal.jsx"
Cohesion: 0.12
Nodes (29): contactCheckCopy(), ELEMENTARY, STANDARD, ACTION_ICONS, Buddy(), CHANNEL_ICONS, ChooseStep(), CloseForNow() (+21 more)

### Community 17 - "k5Bits.jsx"
Cohesion: 0.21
Nodes (12): CLUE_RING, HIGH_ICONS, K5_PRIMARY_BTN, K5_ROUND_BTN, PlanHeader(), SUBJECT_ICONS, PlanChromeContext, PlanDateLine() (+4 more)

### Community 18 - "ClubPage"
Cohesion: 0.07
Nodes (28): ChineseClubPage(), CompetitiveGamingClubPage(), EnglishClubPage(), FocusReactionTrainingClubPage(), FrenchClubPage(), GameStrategyAnalysisClubPage(), GermanClubPage(), GlobalCompetitionsClubPage() (+20 more)

### Community 19 - "AccountForm.jsx"
Cohesion: 0.18
Nodes (18): AccountForm(), handleEmailBlur(), handleSubmit(), refreshCaptcha(), setField(), INITIAL_FIELDS, randomCaptcha(), AccountInput() (+10 more)

### Community 20 - "next"
Cohesion: 0.09
Nodes (39): GET(), isStorageHost(), reply(), STORAGE_HOSTS, GET(), reply(), GET(), reply() (+31 more)

### Community 21 - "reEnrollmentDocuments.js"
Cohesion: 0.15
Nodes (21): ACADEMIC_DOCS, backendHref(), BLOCKER_ORDER, DOC_STATUS_MISSING, docsOf(), HIDDEN, holdLines(), linkOf() (+13 more)

### Community 22 - "backendOrigin.js"
Cohesion: 0.15
Nodes (15): Home(), BackendSwitcher(), apply(), handlePointerMove(), handleReset(), handleSelectChange(), reclamp(), clampToViewport() (+7 more)

### Community 23 - "hasBackendOrigin"
Cohesion: 0.12
Nodes (51): POST(), reply(), POST(), useClubModule(), authHeaders(), changePassword(), getAcademicYearExtension(), getActivityDetails() (+43 more)

### Community 24 - "Inbox.jsx"
Cohesion: 0.10
Nodes (48): InboxComposePage(), InboxPage(), Filters(), FOLDER_ICONS, Folders(), InboxHeader(), K5Inbox(), MessageList() (+40 more)

### Community 25 - "inbox.js"
Cohesion: 0.10
Nodes (34): draftFor(), EMPTY_DRAFT, useInboxCompose(), all(), charCount(), COMPOSE_CLOSED, composeProblem(), composeWarnings() (+26 more)

### Community 26 - "FullScreenLoader"
Cohesion: 0.10
Nodes (35): AddParentDetailsStep(), AddEnrollmentParentDetailsPage(), page(), CourseSelectionStep(), StudentEnrollmentStep3Page(), StudentEnrollmentStep2Page(), ParentDetailsStep(), StudentEnrollmentStep4Page() (+27 more)

### Community 27 - "react"
Cohesion: 0.20
Nodes (15): K5RailButton(), CANVAS, DUR, EASE_OUT, SPRING, STAGGER, ZOOM, MotionContext (+7 more)

### Community 28 - "floating-label-select.jsx"
Cohesion: 0.10
Nodes (27): buttonVariants, Calendar(), CalendarDayButton(), canAutoFocusSearch(), k5Label(), K5MobileSheet(), K5PopoverList(), K5SelectList() (+19 more)

### Community 29 - "PicoGuide.jsx"
Cohesion: 0.09
Nodes (36): GET(), PIXEL, PICO_SAY_EVENT, classesTourSteps(), coveredByDialog(), FIXED_PINS, isMobileView(), noSubscribe() (+28 more)

### Community 30 - "MyCertificates.jsx"
Cohesion: 0.13
Nodes (35): MyCertificatesPage(), CapIcon(), CertCardSkeleton(), CertHeader(), K5Certificates(), Overlay(), PILL, RequestDialog() (+27 more)

### Community 31 - "useDummyStudent"
Cohesion: 0.15
Nodes (18): AllCoursesPickerModal(), 5. Progress, readSearch(), readSearchOnServer(), subscribe(), useDummyStudent(), useQuoteState(), readSeen() (+10 more)

### Community 32 - "K5ProfileEditors.jsx"
Cohesion: 0.20
Nodes (24): border(), ChipToggle(), EditableHobbies(), EditableParent(), EditableParents(), EditablePersonal(), EditableSocial(), EditDate() (+16 more)

### Community 33 - "K5ProfileCustomFields.jsx"
Cohesion: 0.21
Nodes (20): Choice(), ChoiceField(), CustomFields(), DateField(), FileField(), Purpose(), ReadOnlyField(), DOC_TYPE (+12 more)

### Community 34 - "useReEnrollment.js"
Cohesion: 0.13
Nodes (30): 6. Design summary, 8. Impact on other modules (short), Backend, Frontend, Payment flow seen in the real app, eligibilityKey(), eligibilityPollMs(), isCustomPlanUnpaid() (+22 more)

### Community 35 - "CelebrationHost.jsx"
Cohesion: 0.12
Nodes (25): createBurst(), fivePointStar(), fourPointSparkle(), stepAndDrawBurst(), effects, fitCanvas(), onVisibility(), start() (+17 more)

### Community 36 - "profileEdit.js"
Cohesion: 0.14
Nodes (29): useProfileEditor(), buildDraft(), buildEditContext(), buildUnits(), countryName(), DATE_FORMAT, editableCustomFields(), EMPTY_MESSAGE (+21 more)

### Community 37 - "calendarEvents.js"
Cohesion: 0.10
Nodes (39): plain(), attendanceEntityType(), coveredBy(), getFetchRange(), lazyNeed(), loadStoredPrefs(), monthAsk(), monthRange() (+31 more)

### Community 38 - "K5AttendanceDetails.jsx"
Cohesion: 0.12
Nodes (35): COLUMNS, DETAILED_LABEL, joinedNote(), K5AttendanceDetails(), rowKind(), Time(), DEFAULT_ATTENDANCE_CUSTOM_RANGE_DAYS, useAttendanceCustomRangeDays() (+27 more)

### Community 39 - "K5ProgressReportView.jsx"
Cohesion: 0.15
Nodes (32): courseTone(), ACT_GRID, ACT_GRID_NO_MODULE, CourseReport(), CourseWareCourse(), gradeTone(), K5ProgressReportView(), Kv() (+24 more)

### Community 40 - "AddStage3ReviewPayment.jsx"
Cohesion: 0.05
Nodes (98): AddStage3ReviewPayment(), checkPaidStatus(), confirmAndPay(), confirmSubmitApplication(), flushPaidStatusPoll(), handleFailure(), launchGateway(), openSectionFor() (+90 more)

### Community 41 - "add-enrollment/PaymentGatewayPickerModal.jsx"
Cohesion: 0.20
Nodes (17): assetUrl(), CardTiles(), CurrencyCard(), Flag(), GatewayActions(), GatewayPanel(), MethodTile(), NO_PAY_BUTTON (+9 more)

### Community 42 - "useStudentDashboardData"
Cohesion: 0.16
Nodes (21): StudentHomePage(), StudentHome(), ContactCheckModal, StudentHomeForGrade(), ATTEND_OPTIONS, buildRegistrationLink(), GraduationCeremonyModal(), loadYouTubeApi() (+13 more)

### Community 43 - "K5PerformanceIcons.jsx"
Cohesion: 0.17
Nodes (19): STAR_LEVELS, starLevel(), STREAK_BADGES, ArrowUpIcon(), CalendarIcon(), ChartIcon(), CheckBoxIcon(), Flame() (+11 more)

### Community 44 - "useDashboardContext.js"
Cohesion: 0.15
Nodes (25): parseGradeCache(), readGradeCache(), readSearch(), readSearchOnServer(), studentDashboardDetailsQuery(), studentDemoRowQuery(), subscribe(), useResolveDashboardContext() (+17 more)

### Community 45 - "lucide-react"
Cohesion: 0.25
Nodes (16): isAnimatedSource(), isRemoteSource(), OptimizedImage(), ArticleBlock(), NewsAllModal(), NewsDetailModal(), formatNewsDate(), NewsPanel() (+8 more)

### Community 46 - "OnboardingSetup.jsx"
Cohesion: 0.15
Nodes (27): SetupPage(), WelcomePage(), PaymentName(), AcademicStep(), addDays(), BatchReminder(), DoneStep(), errorText() (+19 more)

### Community 47 - "K5BookView.jsx"
Cohesion: 0.12
Nodes (33): AllUsed(), BookArt(), BookHeader(), BookPageSkeleton(), BuddyStrip(), CapTile(), COPY, dayModel() (+25 more)

### Community 48 - "K5Dashboard.jsx"
Cohesion: 0.10
Nodes (40): SantaBuddy(), ActivityCard(), ASSIGNMENT_PILL, Assignments(), CARD_STATE, ClassCard(), CLUE_FOR_STATUS, NoClassDay() (+32 more)

### Community 49 - "payloadEncoding.js"
Cohesion: 0.11
Nodes (23): noStore, POST(), withServiceKey(), body, request, noPlusResult, plusResult, roundTrip() (+15 more)

### Community 50 - "useAddEnrollmentContext.js"
Cohesion: 0.10
Nodes (39): AddEnrollmentEntryPage(), AddEnrollmentEntryRedirect(), ADD_WIZARD_STEPS, ADD_WIZARD_STEPS_FLEX, AddEnrollmentChrome(), AddWizardFrame(), SEGMENT_TO_STEP_KEY, AddCourseSelectionStep() (+31 more)

### Community 51 - "EnrollmentWizardShell.jsx"
Cohesion: 0.08
Nodes (43): ChooseAccountPage(), describe(), metadata, schoolLogo(), EnrollRedirect(), decodePayload(), EnrollPage(), getFirstValue() (+35 more)

### Community 52 - "useContactCheck.js"
Cohesion: 0.20
Nodes (21): farewellShown, flowFor(), flows, IDLE, idleState(), readPage(), useContactCheck(), buildApi() (+13 more)

### Community 53 - "useStudentCart.js"
Cohesion: 0.23
Nodes (20): CART_KEYS, useAddPlanToCart(), useApplyCartDiscount(), useCartInvalidation(), useCreateCartPayment(), useRemoveCartItem(), addPlanToCart(), applyCartDiscount() (+12 more)

### Community 54 - "BookClasses.jsx"
Cohesion: 0.12
Nodes (31): POST(), reply(), BookClassesPage(), useBookSlots(), BookClasses(), Count(), Notice(), PageTitle() (+23 more)

### Community 55 - "useInbox.js"
Cohesion: 0.14
Nodes (28): liveInbox, saveBlob(), say(), sentAsItem(), useInbox(), acknowledgeInboxAnnouncement(), getComposeContacts(), getComposeTemplates() (+20 more)

### Community 56 - "K5Cart.jsx"
Cohesion: 0.20
Nodes (13): BuyExtraClassesPage(), BuyExtraClasses(), add(), CUSTOM_PLAN_NAME, Notice(), PageTitle(), PlanCard(), CustomisePlanModal() (+5 more)

### Community 57 - "ClassFeedbackHost.jsx"
Cohesion: 0.12
Nodes (36): ActivityDetailsModal(), Countdown(), pad(), calendarButtonClass(), CalendarModal(), calendarNoteClass(), PendingFeedbackPopup(), Stat() (+28 more)

### Community 58 - "K5Games.jsx"
Cohesion: 0.07
Nodes (63): GAMES, MEMORY_FACES, newCount(), newMath(), newMemory(), newShape(), numOpts(), playPop() (+55 more)

### Community 59 - "useCourseSelection.js"
Cohesion: 0.22
Nodes (14): handleAiApplied(), buildCourseDetailsRequest(), courseDetailsKey(), isSuccessResponse(), STATUS_SESSION_OUT, STATUS_SUCCESS, useCourseDetails(), useLocalCourseUpdate() (+6 more)

### Community 60 - "useParentDetailsSignup.js"
Cohesion: 0.19
Nodes (25): ParentRelationFields(), handleRelationChange(), persistOther(), ParentRelationFields(), handleRelationChange(), persistOther(), buildAdditionalParent(), buildCommunications() (+17 more)

### Community 61 - "AppearanceSettingsPanel.jsx"
Cohesion: 0.12
Nodes (34): useAppearance(), AppearanceSettingsPanel(), Choice(), DayNightSwitch(), DyslexiaSection(), GradeLookSection(), HandChoice(), LOOK_PREVIEW (+26 more)

### Community 62 - "error.jsx"
Cohesion: 0.21
Nodes (17): Error(), ErrorDetails(), ErrorPageFooter(), ErrorPageHeader(), GlobalError(), NotFound(), AuthSessionProvider(), SessionContext (+9 more)

### Community 63 - "Cart.jsx"
Cohesion: 0.24
Nodes (15): CartPage(), HighPlans(), CartHeader(), CartItem(), CartSkeleton(), K5CartNotice(), K5CartView(), useCartLook() (+7 more)

### Community 64 - "k5Calendar.js"
Cohesion: 0.12
Nodes (21): CLUES, PREK_CLUES, dotColor(), MyCourses(), TodayCard(), TodayGroup(), TodayItem(), WEEK_LETTERS (+13 more)

### Community 65 - "K5Shell.jsx"
Cohesion: 0.21
Nodes (10): AppearanceContext, AppearanceProvider(), HAND_HINT_KEY, parseSaved(), readStorage(), subscribeDark, subscribeReduced, subscribeStorage() (+2 more)

### Community 66 - "student-enroll/FeePaymentPlans.jsx"
Cohesion: 0.19
Nodes (22): Discounts(), FeeBreakdown(), Lines(), Row(), AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows() (+14 more)

### Community 67 - "withSmsAuth"
Cohesion: 0.13
Nodes (18): Browser sign-in with SMS tokens (several users per browser), Checks, Cookies (all HttpOnly, Secure, SameSite=Lax, Path=/), How a request finds its user, Known limits, Settings, Signing in and out, withSmsAuth() (+10 more)

### Community 68 - "K5ProfileP5.jsx"
Cohesion: 0.17
Nodes (30): BADGE, BANK, BankForm(), BankSummary(), clean(), CopyValue(), Modal(), NewRequest() (+22 more)

### Community 69 - "add-enrollment/ReviewInlineEdit.jsx"
Cohesion: 0.06
Nodes (92): AddParentDetails(), clearErrors(), handleSubmit(), toggleSameAsStudent(), defaultFields(), RELATION_OPTIONS, WORKING_PROFESSION_OPTIONS, AddStage1StudentDetails() (+84 more)

### Community 70 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 71 - "K5DashCards.jsx"
Cohesion: 0.20
Nodes (14): SyllabusPage(), dueText(), GoalBox(), GOLD, GREEN, Heading(), MyAssignmentsCard(), MyPerformanceCard() (+6 more)

### Community 72 - "K5Profile.jsx"
Cohesion: 0.17
Nodes (22): K5PhotoDialog(), AcademicSection(), Avatar(), Chip(), Field(), K5Profile(), Mark(), Note() (+14 more)

### Community 73 - "dummyInbox.js"
Cohesion: 0.14
Nodes (17): fresh(), BANDS, buildMessages(), CATEGORY, CHANNEL, contactsOf(), getDummyInbox(), OFFICE (+9 more)

### Community 74 - "PaymentGatewayInitView.jsx"
Cohesion: 0.18
Nodes (14): AirwallexPaymentInitPage(), StripePaymentInitPage(), AirwallexPaymentInitPage(), StripePaymentInitPage(), GATEWAY_CONFIG, getAirwallexCheckoutIntentUrl(), getAirwallexPaymentInitClient(), getFailureMessage() (+6 more)

### Community 75 - "K5InboxCompose.jsx"
Cohesion: 0.21
Nodes (15): K5InboxCompose(), Recipients(), CM_BTN, CM_BTN_PRIMARY, InboxCompose(), Recipients(), EMAIL_SETTINGS_ALWAYS, EMAIL_SETTINGS_INTRO (+7 more)

### Community 76 - "K5NavRail.jsx"
Cohesion: 0.12
Nodes (31): GroupItem(), iconFor(), ICONS, LinkItem(), Sidebar(), CLUB_ART, ClubMark(), flattenItems() (+23 more)

### Community 77 - "PaymentResponseView"
Cohesion: 0.14
Nodes (11): EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage(), PaymentResponseSuccessPage(), RegistrationPaymentResponseSuccessPage(), EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage() (+3 more)

### Community 78 - "useSpeech.js"
Cohesion: 0.23
Nodes (18): SelectToSpeak(), hasSpeech(), noSubscribe(), useSpeech(), voiceOf(), askBackend(), clean(), clipFor() (+10 more)

### Community 79 - "dashboardNav.js"
Cohesion: 0.33
Nodes (9): deriveSegment(), HOME_PAGE_LINKS, iconForLabel(), isActiveModule(), mapBackendMenu(), mapRights(), resolveSegment(), STUDENT_HIDDEN_SEGMENTS (+1 more)

### Community 80 - "add-enrollment/FeePaymentPlans.jsx"
Cohesion: 0.24
Nodes (18): AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows(), currencyOf(), CustomPlanTable(), describeMonths(), discountRow() (+10 more)

### Community 81 - "K5ProgressReports.jsx"
Cohesion: 0.57
Nodes (6): EyeIcon(), GRID, K5ProgressReports(), ReportIcon(), ReportsHeader(), ReportsSkeleton()

### Community 82 - "courseAdvisorApi.js"
Cohesion: 0.30
Nodes (16): required(), useAdvisorChat(), useAdvisorStart(), useAdvisorSuggestions(), useApplySuggestions(), useConfirmMarksheet(), useDismissSuggestions(), applyAdvisorSuggestions() (+8 more)

### Community 83 - "profileModel.js"
Cohesion: 0.25
Nodes (19): buildProfileModel(), CUSTOM_TYPES, customFieldsOf(), DIAL_BY_ISO, dialCode(), DOCS, filled(), fullName() (+11 more)

### Community 84 - "ReEnrollmentOptions.jsx"
Cohesion: 0.22
Nodes (13): ReEnrollmentPage(), K5PassedOptions(), Offer(), DiscountBanner(), HelpCard(), OPTION_BUTTON, pad(), ProgramChips() (+5 more)

### Community 85 - "onboardingGateApi.js"
Cohesion: 0.24
Nodes (19): addMinutes(), bookSystemTraining(), failedAnswer(), fetchLayerDetails(), fetchTrainingSlots(), flagsOf(), getOnboardingStatus(), getSetupDetails() (+11 more)

### Community 86 - "K5Attendance.jsx"
Cohesion: 0.11
Nodes (27): AttendancePage(), academicYearMonths(), AttendanceHeader(), AttendanceSkeleton(), badgeOf(), buildMonth(), GOLD, K5Attendance() (+19 more)

### Community 87 - "useOnboardingGate.js"
Cohesion: 0.35
Nodes (10): 0. v3 UPDATE (2026-11-20, later) — this section wins over sections 3, 5, 6, 9, 11, guardKey(), onboardingDestination(), onboardingTarget(), readGuard(), setupPath(), useOnboardingGate(), welcomePath() (+2 more)

### Community 88 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, apexcharts@^8.6.0, @base-ui/react@^1.8.0, cn@^0.3.0, date-fns@^4.4.0, date-fns-tz@^3.2.0, dompurify@^3.2.4, framer-motion@^14.14.0 (+9 more)

### Community 89 - "AiAdvisorDialog.jsx"
Cohesion: 0.14
Nodes (17): ACTION_BADGE, BANDS, ConsentNote(), formatCredit(), ListProgress(), MarksheetTable(), NO_RETRY_CODES, OptionCard() (+9 more)

### Community 90 - "AI Course Advisor — Implementation Plan"
Cohesion: 0.18
Nodes (10): 10. Data audit results (staging, 2026-10-09), 1. Ground rules, 2. Settings (`Settings`, type `CONFIGURATION`), 3. When the AI Suggester shows, 4. Student flow, 5. Server API (`is-rest-api`), 7. Frontend (`is-sms`), render only, 9. Decisions (+2 more)

### Community 91 - "ChristmasProvider.jsx"
Cohesion: 0.19
Nodes (15): bell(), dropUnlock(), jingle(), schedule(), SONG, startChristmasMusic(), stopChristmasMusic(), ChristmasContext (+7 more)

### Community 92 - "Transcript.jsx"
Cohesion: 0.33
Nodes (7): TranscriptPage(), ActionDropdown(), Transcript(), transcriptBlockReasons(), blockedTranscripts(), NEW_TYPES, transcriptLinks()

### Community 93 - "SystemTrainingPopup.jsx"
Cohesion: 0.20
Nodes (21): K5SystemTrainingRescheduleDialog(), CardHeader(), Chip(), K5DialogShell(), K5RedClose(), K5RescheduleConfirm(), K5RescheduleHeader(), K5ReschedulePicker() (+13 more)

### Community 94 - "Stage3CourseSelection.jsx"
Cohesion: 0.13
Nodes (16): getGradeBand(), selectedSummary(), addableCountLabel(), canRemoveSelected(), categoryIcon(), CourseCategoryDialog(), CourseSummaryLink(), CreditProgressRing() (+8 more)

### Community 95 - "AiAdvisorDialog"
Cohesion: 0.18
Nodes (13): AiAdvisorDialog(), goToQuestions(), handleApply(), handleAsk(), handleConfirmMarks(), handleFiles(), handleSuggest(), loadStart() (+5 more)

### Community 96 - "Re-enrollment — "Download your transcript" card: full handoff"
Cohesion: 0.15
Nodes (12): 10. Verify before / while coding, 11. Next step, 1. Files made so far, 2. The feature (what the user asked), 3. Decisions (in order they were made), 4. Code findings (where things are), 5. Why a new endpoint (not eligibility), 7. Prototype (what it shows) (+4 more)

### Community 97 - "devDependencies"
Cohesion: 0.18
Nodes (9): devDependencies, @playwright/test@^1.64.1, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^26.6.2, @playwright/test, tailwindcss, @tailwindcss/postcss (+1 more)

### Community 98 - "K5Performance.jsx"
Cohesion: 0.22
Nodes (16): BehindBanner(), Header(), Hero(), K5Performance(), PerformanceSkeleton(), PILLS, QUIET, TABS (+8 more)

### Community 99 - "verifyAccountAuth.mjs"
Cohesion: 0.16
Nodes (13): at, b64(), check(), held, jar, other, { privateKey, publicKey }, rejects() (+5 more)

### Community 100 - "diaryApi.js"
Cohesion: 0.37
Nodes (12): POST(), reply(), toInt(), getDiaryBadgeVersion(), getDiaryMentionUsers(), getDiaryThreadList(), getDiaryThreadMessages(), getDiaryUnreadCount() (+4 more)

### Community 101 - "K5PerformanceCompare.jsx"
Cohesion: 0.25
Nodes (13): BANDS, CompareCard(), fmtGap(), gapBar(), GLANCE_GRID, K5PerformanceCompare(), LockIcon(), overallOf() (+5 more)

### Community 102 - "K5PerformanceCourseView.jsx"
Cohesion: 0.16
Nodes (25): K5RowsSkeleton(), CourseRow(), K5PerformanceCourseList(), salutation(), teacherName(), ACT_GRID, Bar(), GradeHistory() (+17 more)

### Community 103 - "K5Toolbar.jsx"
Cohesion: 0.17
Nodes (17): K5ClockIcon(), greeting(), K5Toolbar(), VIEWS, zoneLabel(), DROPS, K5WeatherTile(), kindOf() (+9 more)

### Community 104 - "DashboardChrome.jsx"
Cohesion: 0.11
Nodes (27): DashboardBody(), DashboardChrome(), DashboardTitle(), isOnboardingPath(), LastPathRecorder(), OnboardingGate(), SessionExpiryWatcher(), ShellForGrade() (+19 more)

### Community 105 - "D3 — Transcript: Diploma link and "(New)" label"
Cohesion: 0.15
Nodes (12): Backend change (additive, one method), D2 and D3 — backend plan (2026-11-14), D2 — Canvas and Courseware report bodies, D3 — Transcript: Diploma link and "(New)" label, Decision (2026-11-14, user), Done, Finding, Frontend (after the backend ships) (+4 more)

### Community 106 - "profileOtpApi.js"
Cohesion: 0.33
Nodes (8): useProfileOtp(), EMAIL_FIELDS, fail(), otpRequest(), PHONE_FIELDS, sendProfileOtp(), verifyProfileOtp(), WHATSAPP_FIELD

### Community 107 - "sheet.jsx"
Cohesion: 0.20
Nodes (8): Sheet(), SheetContent(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SIDE_CLASSES

### Community 108 - "StudentHomeK5.jsx"
Cohesion: 0.11
Nodes (43): INITIAL, isChristmasKey(), listeners, setChristmasPlanner(), ColourClues(), DayPlan(), PlanTile(), StatusPills() (+35 more)

### Community 109 - "Image Optimization and Next.js Image Component Rules"
Cohesion: 0.18
Nodes (10): 1. Prefer Next.js Image Component, 2. Image Dimensions and Layout, 3. External and Dynamic Images, 4. Loading and Performance, 5. Special Cases, 6. Mandatory Development Workflow, 7. Preserve Existing Functionality, 8. Project-Wide Enforcement (+2 more)

### Community 110 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, verify:account-auth, verify:contact-check, verify:cookie-domain (+3 more)

### Community 111 - "AddStage2CourseSelection.jsx"
Cohesion: 0.14
Nodes (16): categoryIcon(), CourseSummaryLink(), CreditProgressRing(), isNoLiveClasses(), SkeletonBlock(), Stage3Skeleton(), subjectNotes(), summarizeSelection() (+8 more)

### Community 112 - "FullScreenLoader"
Cohesion: 0.24
Nodes (9): AddEnrollmentStepLoading(), MyClassesGate(), MyClassesPage(), EnrollmentLoading(), StepLoading(), GlobalLoader(), FullScreenLoader(), Loader() (+1 more)

### Community 113 - "layout.js"
Cohesion: 0.14
Nodes (13): caveat, metadata, openSans, RootLayout(), viewport, AppToaster(), scheduleUpdate(), updatePosition() (+5 more)

### Community 114 - "Tooltip"
Cohesion: 0.18
Nodes (10): upgradeHint(), VariantToggle(), OfflineForm(), DocSlot(), OfflineForm(), upgradeHint(), VariantToggle(), Tooltip() (+2 more)

### Community 115 - "verifyContactCheckFlow.mjs"
Cohesion: 0.08
Nodes (26): CHANNELS, ContactCheckModal, ContactSummaryCard(), STATUS, TONE, needsAttention(), useContactSummary(), EMAIL (+18 more)

### Community 116 - "AcademicYearExtension.jsx"
Cohesion: 0.20
Nodes (16): AcademicYearExtensionPage(), AcademicYearExtension(), avail(), openCourse(), buildProceed(), CourseCard(), courseImage(), ExtensionDetail() (+8 more)

### Community 117 - "AI Course Advisor — Rollout Runbook (Phase 6)"
Cohesion: 0.29
Nodes (6): 1. Deploy (once), 2. Live AI check (before switching anything on), 3. Who sees it, 4. Smoke test per stage (about 10 minutes), 5. Metrics (read-only SQL), AI Course Advisor — Rollout Runbook (Phase 6)

### Community 118 - "paymentResponseApi.js"
Cohesion: 0.54
Nodes (7): backendUrl(), buildQuery(), getJson(), getPaymentResponseFailure(), getPaymentResponseSuccess(), getPaymentSettlementStatus(), SUCCESS_ENDPOINTS

### Community 119 - "AddCreatePassword.jsx"
Cohesion: 0.31
Nodes (9): AddEnrollmentCreatePasswordPage(), metadata, AddCreatePassword(), initials(), PasswordField(), RULES, subscribeNone(), loadCreatePasswordTarget() (+1 more)

### Community 120 - "prepareMarksheetFiles"
Cohesion: 0.53
Nodes (5): downscale(), IMAGE_TYPES, isImage(), isPdf(), prepareMarksheetFiles()

### Community 121 - "locationFinder.js"
Cohesion: 0.19
Nodes (9): PhoneNumberField(), decorateFullscreenPopup(), useIntlTelInput(), handleOpenSelector(), getIpLocation(), callLocationForPaymentFill(), fetchIpLocation(), getCountryISOCode() (+1 more)

### Community 122 - "login-credentials/route.js"
Cohesion: 0.60
Nodes (4): COOKIE_DOMAINS, encodeCookieValue(), POST(), sharedCookieDomain()

### Community 123 - "LoginHistory.jsx"
Cohesion: 0.27
Nodes (9): LoginHistoryPage(), assetUrl(), HEADERS, LoginHistory(), SummaryCard(), TONES, resolveStudentName(), useStudentLoginHistory() (+1 more)

### Community 126 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.5, eslint, eslint-config-next

### Community 134 - "useDashboardContext"
Cohesion: 0.09
Nodes (39): MyProfilePage(), ChangePasswordModal(), PasswordInput(), RULES, DashboardShell(), useWideLayout(), DashboardTopHeader(), dayKey() (+31 more)

### Community 135 - "ReserveSeatForNextGrade.jsx"
Cohesion: 0.26
Nodes (13): AppInstallPrompt(), dismissedUntilNow(), rememberDismissed(), runsAsInstalledApp(), storageKey(), subscribeNothing(), Credential(), OutlookReminder() (+5 more)

### Community 136 - "add-enrollment/PaymentGatewayPickerModal.jsx"
Cohesion: 0.29
Nodes (13): assetUrl(), CardTiles(), CurrencyCard(), Flag(), GatewayActions(), GatewayPanel(), MethodTile(), NO_PAY_BUTTON (+5 more)

### Community 137 - "sessionState.js"
Cohesion: 0.14
Nodes (23): QueryProvider(), BAND_COPY, BlinkingDots(), Hourglass(), LOOKS, SessionExpiredDialog(), login(), useDashboardSessionExpiry() (+15 more)

### Community 138 - "k5Bits.jsx"
Cohesion: 0.19
Nodes (24): HighIcon(), highIconKey(), SubjectIcon(), SubjectTile(), K5Sk(), K5TeacherSkeleton(), K5TilesSkeleton(), asArray() (+16 more)

### Community 139 - "K5ClassesHeader.jsx"
Cohesion: 0.44
Nodes (7): ChristmasLights(), ChristmasTreeIcon(), ColourPicture(), K5ClassesHeader(), LineCalendar(), useSecondClock(), zoneLabel()

### Community 140 - "8. Phases"
Cohesion: 0.22
Nodes (9): 8. Phases, Phase 0: Groundwork, Phase 1: Context builder and validator (server, read-only), Phase 2: Marksheet, Phase 3: Recommend and apply (server), Phase 4: Frontend and AI transitions, Phase 5: Chat (`COURSE_ADVISOR_CHAT_ENABLED`), Phase 6: Rollout (+1 more)

### Community 141 - "K5BrainBreak.jsx"
Cohesion: 0.21
Nodes (15): BreakDialog(), Cloud(), Footprints(), Glass(), K5BrainBreak(), Shoe(), Star(), Tick() (+7 more)

### Community 142 - "EventDetailModal.jsx"
Cohesion: 0.40
Nodes (10): DetailRow(), AssignmentDetail(), ClassOrActivityDetail(), EventDetailModal(), formatDuration(), formatLate(), formatSpan(), HolidayOrEventDetail() (+2 more)

### Community 143 - "AnnouncementDetailModal.jsx"
Cohesion: 0.46
Nodes (8): AnnouncementDetailModal(), formatAnnouncementDate(), AnnouncementsWidget(), AttachmentPreviewDialog(), K5AnnouncementDetailModal(), submitAnnouncementAcknowledge(), getAttachmentUrl(), isImageAttachment()

### Community 144 - "K5LiveClassWatcher.jsx"
Cohesion: 0.26
Nodes (10): JoinClassModal(), statusLabel(), noSubscribe(), readSession(), Watcher(), setPicoLive(), nowIn(), useK5CalendarModel() (+2 more)

### Community 145 - "ShapeLayer.js"
Cohesion: 0.53
Nodes (5): cloud(), createShapes(), pickKind(), star(), stepAndDrawShapes()

### Community 147 - "Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)"
Cohesion: 0.22
Nodes (8): 1. Project in one paragraph, 3. How things are wired (quick map), 4. Status — what is DONE (all committed by the user, up to is-sms "Student New Dashboard Part 31"), 5. NOT verified because the Java backend (8080) was down — do these first once it runs, 6. What is LEFT (not code-blocked), 7. Testing how-to, 8. Open decisions / things to ask the user, Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)

### Community 148 - "DocumentUploadPanel.jsx"
Cohesion: 0.22
Nodes (11): ACCEPTED_TYPES, DocRow(), DocumentUploadPanel(), onUpload(), viewOf(), isPdf(), PreviewImage(), PROFILE_DOC_KEY (+3 more)

### Community 150 - "profileApi.js"
Cohesion: 0.67
Nodes (5): getMyProfile(), idOf(), loadPlaceNames(), loadWithdrawalEligibility(), unique()

### Community 151 - "K5Transcript.jsx"
Cohesion: 0.29
Nodes (9): TAB_ACCOUNT_STORAGE_KEY, TabAccount(), K5TableSkeleton(), COLUMNS, DownloadButton(), K5Transcript(), downloadTranscriptDocument(), isDownloadableTranscriptLink() (+1 more)

### Community 152 - "CompleteProfileModal.jsx"
Cohesion: 0.33
Nodes (10): CompleteProfileModal(), empty(), FieldLine(), label(), SectionBlock(), fieldLabel(), isMissing(), K5CompleteProfileModal() (+2 more)

### Community 153 - "AccountSetupSection.jsx"
Cohesion: 0.31
Nodes (9): AccountSetupSection(), CredRow(), OutlookCredentials(), Step(), CopyButton(), LoginDetails(), cache, createPasswordPath() (+1 more)

### Community 154 - "marketingConsent.js"
Cohesion: 0.09
Nodes (39): AnalyticsScripts(), CampaignCookieInitializer(), ConsentBanner(), Switch(), EnrollmentPixel(), isEnrollmentPath(), loadPixel(), collectMetaParams() (+31 more)

### Community 155 - "useK5ThemeProps.js"
Cohesion: 0.20
Nodes (9): andika, atkinson, dmSans, fredoka, k5FontVariables, lexend, nunito, outfit (+1 more)

### Community 156 - "K5ProfileEditorsP3.jsx"
Cohesion: 0.25
Nodes (13): ClubChip(), EditableCallingTimes(), EditableSports(), EditableTiming(), SlotChip(), startOfToday(), TIME_OPTIONS, timeLabel() (+5 more)

### Community 157 - "RightActionRail.jsx"
Cohesion: 0.20
Nodes (17): AnnouncementsPanel(), formatRelativeAgo(), RailButton(), RightActionRailContent(), K5AnnouncementsPanel(), EmptyNote(), K5Drawer(), K5NewsAllModal() (+9 more)

### Community 158 - "TranscriptDownloadCard.jsx"
Cohesion: 0.35
Nodes (10): DocumentsReason(), HoldReason(), REASON_ICON, TranscriptDownloadCard(), reEnrollmentDocumentsKey(), useReEnrollmentDocuments(), notifyReEnrollmentDocumentsUploaded(), demoReEnrollmentDocuments() (+2 more)

### Community 159 - "TranscriptBlockedNotice.jsx"
Cohesion: 0.24
Nodes (9): fixable(), ICON, ReasonText(), TranscriptBlockedNotice(), BLOCKER_DOCUMENTS, BLOCKER_NOT_AVAILABLE, BLOCKER_ON_HOLD, BLOCKER_UNDER_VERIFICATION (+1 more)

### Community 160 - "logout.js"
Cohesion: 0.22
Nodes (13): WizardLayout(), SEGMENT_TO_STEP_KEY, WizardChrome(), WizardFrame(), OnboardingFrame(), OnboardingShell(), useBackendSessionGuard(), EnrollmentProvider() (+5 more)

### Community 161 - "K5LoginHistory.jsx"
Cohesion: 0.43
Nodes (7): COLUMNS, K5LoginHistory(), LoginHeader(), LoginSkeleton(), PageButton(), SummaryTile(), svgProps

### Community 162 - "ExamDetails.jsx"
Cohesion: 0.60
Nodes (3): ExamDetailsPage(), ExamDetails(), useStudentExaminationDetails()

### Community 163 - "verifyPaymentAttemptRecovery.mjs"
Cohesion: 0.40
Nodes (4): alreadyPaid, attempt, otherBrowser, unavailable

### Community 164 - "StudentHandbook.jsx"
Cohesion: 0.46
Nodes (5): StudentHandbookPage(), assetUrl(), StudentHandbook(), findModuleId(), useModuleRights()

### Community 166 - "FeeDetails.jsx"
Cohesion: 0.08
Nodes (38): FeeDetailsPage(), ProgressReportsPage(), PerformancePage(), PurchasedPlans(), feeAction(), FeeDetails(), HEADERS, paymentName() (+30 more)

### Community 170 - "package.json"
Cohesion: 0.17
Nodes (11): next-auth@^5.0.0-beta.32, react-day-picker@^10.0.1, react-dom@19.2.8, tw-animate-css@^1.4.0, name, private, version, next-auth (+3 more)

## Knowledge Gaps
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `FullScreenLoader` to `k5PerformanceData.js`, `studentSignupBackendApi.js`, `calendarEvents.js`, `VideoLibrary.jsx`, `useReEnrollment.js`, `PaymentResponseView.jsx`, `K5BookedView.jsx`, `DialogContent`, `K5Shell.jsx`, `usePicoContentReady`, `K5DiaryPanel.jsx`, `backendRequest`, `ContactCheckModal.jsx`, `k5Bits.jsx`, `ClubPage`, `AccountForm.jsx`, `backendOrigin.js`, `Inbox.jsx`, `inbox.js`, `react`, `floating-label-select.jsx`, `PicoGuide.jsx`, `MyCertificates.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `K5ProfileCustomFields.jsx`, `useReEnrollment.js`, `CelebrationHost.jsx`, `profileEdit.js`, `calendarEvents.js`, `K5AttendanceDetails.jsx`, `K5ProgressReportView.jsx`, `AddStage3ReviewPayment.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `useStudentDashboardData`, `useDashboardContext.js`, `lucide-react`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `useAddEnrollmentContext.js`, `EnrollmentWizardShell.jsx`, `useContactCheck.js`, `BookClasses.jsx`, `useInbox.js`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `K5Games.jsx`, `AppearanceSettingsPanel.jsx`, `error.jsx`, `Cart.jsx`, `k5Calendar.js`, `K5Shell.jsx`, `student-enroll/FeePaymentPlans.jsx`, `K5ProfileP5.jsx`, `add-enrollment/ReviewInlineEdit.jsx`, `K5DashCards.jsx`, `K5Profile.jsx`, `PaymentGatewayInitView.jsx`, `K5InboxCompose.jsx`, `K5NavRail.jsx`, `useSpeech.js`, `add-enrollment/FeePaymentPlans.jsx`, `K5ProgressReports.jsx`, `ReEnrollmentOptions.jsx`, `K5Attendance.jsx`, `useOnboardingGate.js`, `dependencies`, `AiAdvisorDialog.jsx`, `ChristmasProvider.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `Stage3CourseSelection.jsx`, `K5Performance.jsx`, `K5PerformanceCompare.jsx`, `K5PerformanceCourseView.jsx`, `K5Toolbar.jsx`, `DashboardChrome.jsx`, `profileOtpApi.js`, `sheet.jsx`, `StudentHomeK5.jsx`, `AddStage2CourseSelection.jsx`, `FullScreenLoader`, `layout.js`, `Tooltip`, `verifyContactCheckFlow.mjs`, `AcademicYearExtension.jsx`, `AddCreatePassword.jsx`, `locationFinder.js`, `LoginHistory.jsx`, `useDashboardContext`, `ReserveSeatForNextGrade.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `sessionState.js`, `k5Bits.jsx`, `K5ClassesHeader.jsx`, `K5BrainBreak.jsx`, `AnnouncementDetailModal.jsx`, `K5LiveClassWatcher.jsx`, `DocumentUploadPanel.jsx`, `K5Transcript.jsx`, `CompleteProfileModal.jsx`, `AccountSetupSection.jsx`, `marketingConsent.js`, `useK5ThemeProps.js`, `K5ProfileEditorsP3.jsx`, `RightActionRail.jsx`, `TranscriptDownloadCard.jsx`, `logout.js`, `K5LoginHistory.jsx`, `FeeDetails.jsx`, `package.json`?**
  _High betweenness centrality (0.283) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useDummyStudent()` (e.g. with `Phase 0 — foundation (blocks everything else)` and `readSearch()`) actually correct?**
  _`useDummyStudent()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `studentSignupBackendApi.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06892230576441102 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `DialogContent` to `k5PerformanceData.js`, `studentSignupBackendApi.js`, `calendarEvents.js`, `VideoLibrary.jsx`, `useReEnrollment.js`, `PaymentResponseView.jsx`, `K5BookedView.jsx`, `K5Shell.jsx`, `usePicoContentReady`, `K5DiaryPanel.jsx`, `ContactCheckModal.jsx`, `k5Bits.jsx`, `ClubPage`, `AccountForm.jsx`, `backendOrigin.js`, `Inbox.jsx`, `floating-label-select.jsx`, `PicoGuide.jsx`, `MyCertificates.jsx`, `K5ProfileEditors.jsx`, `K5ProfileCustomFields.jsx`, `K5AttendanceDetails.jsx`, `K5ProgressReportView.jsx`, `AddStage3ReviewPayment.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `useStudentDashboardData`, `lucide-react`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `EnrollmentWizardShell.jsx`, `BookClasses.jsx`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `K5Games.jsx`, `AppearanceSettingsPanel.jsx`, `Cart.jsx`, `k5Calendar.js`, `student-enroll/FeePaymentPlans.jsx`, `K5ProfileP5.jsx`, `add-enrollment/ReviewInlineEdit.jsx`, `K5DashCards.jsx`, `K5Profile.jsx`, `PaymentGatewayInitView.jsx`, `K5InboxCompose.jsx`, `K5NavRail.jsx`, `useSpeech.js`, `add-enrollment/FeePaymentPlans.jsx`, `ReEnrollmentOptions.jsx`, `K5Attendance.jsx`, `dependencies`, `AiAdvisorDialog.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `Stage3CourseSelection.jsx`, `K5Toolbar.jsx`, `DashboardChrome.jsx`, `sheet.jsx`, `StudentHomeK5.jsx`, `AddStage2CourseSelection.jsx`, `FullScreenLoader`, `layout.js`, `verifyContactCheckFlow.mjs`, `AcademicYearExtension.jsx`, `AddCreatePassword.jsx`, `LoginHistory.jsx`, `useDashboardContext`, `ReserveSeatForNextGrade.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `sessionState.js`, `k5Bits.jsx`, `K5BrainBreak.jsx`, `AnnouncementDetailModal.jsx`, `K5LiveClassWatcher.jsx`, `DocumentUploadPanel.jsx`, `K5Transcript.jsx`, `CompleteProfileModal.jsx`, `AccountSetupSection.jsx`, `K5ProfileEditorsP3.jsx`, `RightActionRail.jsx`, `TranscriptDownloadCard.jsx`, `TranscriptBlockedNotice.jsx`, `K5LoginHistory.jsx`, `ExamDetails.jsx`, `StudentHandbook.jsx`, `FeeDetails.jsx`, `package.json`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `calendarEvents.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08653061224489796 - nodes in this community are weakly interconnected._
- **Why does `useDashboardContext()` connect `useDashboardContext` to `VideoLibrary.jsx`, `ReserveSeatForNextGrade.jsx`, `K5BookedView.jsx`, `sessionState.js`, `DialogContent`, `K5ClassesHeader.jsx`, `k5Bits.jsx`, `K5BrainBreak.jsx`, `EventDetailModal.jsx`, `K5DiaryPanel.jsx`, `ContactCheckModal.jsx`, `k5Bits.jsx`, `K5LiveClassWatcher.jsx`, `K5Shell.jsx`, `usePicoContentReady`, `ClubPage`, `K5Transcript.jsx`, `Inbox.jsx`, `useK5ThemeProps.js`, `react`, `PicoGuide.jsx`, `MyCertificates.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `K5LoginHistory.jsx`, `logout.js`, `ExamDetails.jsx`, `StudentHandbook.jsx`, `calendarEvents.js`, `K5AttendanceDetails.jsx`, `K5ProgressReportView.jsx`, `FeeDetails.jsx`, `useStudentDashboardData`, `useDashboardContext.js`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `useContactCheck.js`, `BookClasses.jsx`, `useInbox.js`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `AppearanceSettingsPanel.jsx`, `Cart.jsx`, `k5Calendar.js`, `K5DashCards.jsx`, `K5NavRail.jsx`, `K5ProgressReports.jsx`, `ReEnrollmentOptions.jsx`, `K5Attendance.jsx`, `ChristmasProvider.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `K5Performance.jsx`, `K5PerformanceCourseView.jsx`, `DashboardChrome.jsx`, `StudentHomeK5.jsx`, `FullScreenLoader`, `verifyContactCheckFlow.mjs`, `AcademicYearExtension.jsx`, `LoginHistory.jsx`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `VideoLibrary.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08139876579488686 - nodes in this community are weakly interconnected._