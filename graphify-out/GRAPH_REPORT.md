# Graph Report - is-sms  (2026-11-24)

## Corpus Check
- 664 files · ~540,736 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .css 10, .otf 4, (none) 3)

## Summary
- 4365 nodes · 15814 edges · 167 communities (154 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 208 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6388a01`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- k5PerformanceData.js
- add-enrollment/ReviewInlineEdit.jsx
- Stage3CourseSelection.jsx
- calendarEvents.js
- VideoLibrary.jsx
- useReEnrollment.js
- createDummyStudent
- PaymentResponseView.jsx
- K5BookedView.jsx
- AddStage2CourseSelection.jsx
- DialogContent
- K5Shell.jsx
- usePicoContentReady
- session.js
- K5DiaryPanel.jsx
- backendRequest
- ContactCheckModal.jsx
- StudentHomeK5.jsx
- ClubPage
- AccountForm.jsx
- next
- TranscriptDownloadCard.jsx
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
- useStudentCalendar.js
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
- expireSession
- EnrollmentWizardShell.jsx
- useContactCheck.js
- useStudentCart.js
- BookClasses.jsx
- useInbox.js
- K5Cart.jsx
- ClassFeedbackHost.jsx
- K5Games.jsx
- useCourseSelection.js
- GlobalLoader.jsx
- AppearanceSettingsPanel.jsx
- error.jsx
- Cart.jsx
- K5AttendanceDetails.jsx
- K5Shell.jsx
- student-enroll/FeePaymentPlans.jsx
- Browser sign-in with SMS tokens (several users per browser)
- K5ProfileP5.jsx
- add-enrollment/ReviewInlineEdit.jsx
- components.json
- DashboardTopHeader.jsx
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
- Skeleton
- AiAdvisorDialog
- Re-enrollment — "Download your transcript" card: full handoff
- devDependencies
- K5Performance.jsx
- verifyAccountAuth.mjs
- diaryApi.js
- K5PerformanceCompare.jsx
- K5PerformanceCourseView.jsx
- AppDownloadDialog.jsx
- useDashboardContext
- D3 — Transcript: Diploma link and "(New)" label
- profileOtpApi.js
- sheet.jsx
- StudentHomeK5.jsx
- Image Optimization and Next.js Image Component Rules
- scripts
- ReEnrollmentReview.jsx
- AddStudentDetailsStep.jsx
- layout.js
- ContactSummaryCard.jsx
- verifyContactCheckFlow.mjs
- AcademicYearExtension.jsx
- AI Course Advisor — Rollout Runbook (Phase 6)
- paymentResponseApi.js
- AddCreatePassword.jsx
- prepareMarksheetFiles
- useStudentLoginHistory.js
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
- K5Header.jsx
- ReserveSeatForNextGrade.jsx
- PaymentInProgressModal.jsx
- sessionState.js
- k5Bits.jsx
- K5ClassesHeader.jsx
- 8. Phases
- K5BrainBreak.jsx
- date-fns
- Inbox
- contactCheckCopy.js
- ShapeLayer.js
- verifyPaymentAttemptRecovery.mjs
- Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)
- [school]/page.jsx
- qrcode.react
- profileApi.js
- marketingConsent.js
- Attendance.jsx
- campaignCookies.js
- K5ProfileEditorsP3.jsx
- diaryClient.js
- cookieDomain.js
- useAddSiblings.js
- logout.js
- getLearningProgramRouteCode
- AnalyticsScripts.jsx
- useSystemTrainingReschedule.js
- StudentHandbook.jsx
- Performance.jsx
- react-apexcharts
- package.json
- react-dom

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
- `0. v3 UPDATE (2026-11-20, later) — this section wins over sections 3, 5, 6, 9, 11` --references--> `useOnboardingGate()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → hooks/useOnboardingGate.js
- `Payment flow seen in the real app` --references--> `useReEnrollmentEntry()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → hooks/useReEnrollmentEntry.js
- `9. Phases` --references--> `useCartCheckout()`  [INFERRED]
  docs/migration/re-enrollment-transcript-download-handoff.md → hooks/useCartCheckout.js
- `Finding` --references--> `useProgressReport()`  [INFERRED]
  docs/migration/d2_d3_backend_plan_2026-11-14.md → components/student/ProgressReportView.jsx
- `Phase 4 — transactional flows` --references--> `showDummyStripeCheckoutPage()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → utils/paymentGatewayChecks.js

## Import Cycles
- 2-file cycle: `components/k5/pages/K5ProfileEditors.jsx -> components/k5/pages/K5ProfileEditorsP3.jsx -> components/k5/pages/K5ProfileEditors.jsx`

## Communities (167 total, 13 thin omitted)

### Community 0 - "k5PerformanceData.js"
Cohesion: 0.14
Nodes (29): addDays(), daysBetween(), daysTo(), fmtDay(), fmtWeekday(), GOAL_SCORES, isoTime(), MEDALS (+21 more)

### Community 1 - "add-enrollment/ReviewInlineEdit.jsx"
Cohesion: 0.07
Nodes (45): AddStage1StudentDetails(), handleSubmit(), FieldSkeleton(), GENDER_OPTIONS, INITIAL_FIELDS, LEARNING_PROGRAMS, Stage1Skeleton(), validateAddStudentFields() (+37 more)

### Community 2 - "Stage3CourseSelection.jsx"
Cohesion: 0.09
Nodes (36): useIsMobile(), update(), AiSuggesterCard(), addableCountLabel(), canRemoveSelected(), categoryIcon(), CourseCategoryDialog(), CourseSummaryLink() (+28 more)

### Community 3 - "calendarEvents.js"
Cohesion: 0.07
Nodes (50): CalendarDatepicker(), CalendarFilters(), CourseRow(), FilterRow(), FilterSection(), TodaySubgroup(), TodaySummaryItem(), CourseColorPicker() (+42 more)

### Community 4 - "VideoLibrary.jsx"
Cohesion: 0.08
Nodes (77): VideoLibraryPage(), AccessBar(), CourseChips(), K5VideoLibrary(), ModuleHeading(), Row(), Stage(), tint() (+69 more)

### Community 5 - "useReEnrollment.js"
Cohesion: 0.13
Nodes (31): ReEnrollmentCourseSelectionPage(), ReEnrollmentPaymentPage(), Frame(), useCustomPlanWatch(), ReEnrollmentCourseSelection(), ICONS, ReEnrollmentFlow(), ReEnrollmentStepCard() (+23 more)

### Community 6 - "createDummyStudent"
Cohesion: 0.06
Nodes (89): 1. How the file is built, 2. How dummy mode turns on (legacy), 3. Every public export → legacy caller → Next.js target, 4. Implementation plan (Next.js), Dummy (demo) student mode — legacy analysis and Next.js plan, Not needed for the student dashboard, Phase 0 — foundation (blocks everything else), Phase 1 — modules built in this session (small, self-contained) (+81 more)

### Community 7 - "PaymentResponseView.jsx"
Cohesion: 0.11
Nodes (45): AccountInfoCard(), AddEnrollmentAccountInfo(), AddEnrollmentThankYouReplay(), buildRedirectHref(), CircularCountdown(), ConfirmingCard(), ContactEmail(), CopyButton() (+37 more)

### Community 8 - "K5BookedView.jsx"
Cohesion: 0.08
Nodes (33): COLUMNS, COLUMNS_MIDDLE, COUNT_KEYS, DATE_TYPES, DATE_TYPES_MIDDLE, DEFAULT_FILTER, initialsOf(), K5BookedView() (+25 more)

### Community 9 - "AddStage2CourseSelection.jsx"
Cohesion: 0.09
Nodes (35): AddStage2CourseSelection(), addSubject(), applyChange(), ask(), confirmRecommended(), handleAiApplied(), handleFailure(), handleGradeChange() (+27 more)

### Community 10 - "DialogContent"
Cohesion: 0.09
Nodes (57): FeeDetailsPage(), ChangeGradeDialog(), ConfirmDialog(), FlaggedSeatsModal(), InfoModal(), LogoutConfirmDialog(), RecommendedCoursesDialog(), EditCard() (+49 more)

### Community 11 - "K5Shell.jsx"
Cohesion: 0.36
Nodes (10): ReadingRuler(), MusicDisc(), ChristmasBanner(), ChristmasSky(), ChristmasToast(), FLAKES, useChristmas(), K5LiveClassWatcher() (+2 more)

### Community 12 - "usePicoContentReady"
Cohesion: 0.09
Nodes (44): ExamDetailsPage(), K5_CARD, K5BlockSkeleton(), K5CardsSkeleton(), K5HomeLeftSkeleton(), K5Loading(), K5PlanSkeleton(), K5ProfileSkeleton() (+36 more)

### Community 13 - "session.js"
Cohesion: 0.09
Nodes (55): GET(), POST(), GET(), safeReturn(), GET, handleSsoHandoff(), POST, redirectTo() (+47 more)

### Community 14 - "K5DiaryPanel.jsx"
Cohesion: 0.14
Nodes (44): DiaryAvatar(), DiaryLoadError(), DiaryMessageText(), FloatingDateChip(), DiaryEntryCard(), DiaryPanel(), DiarySkeleton(), formatWhen() (+36 more)

### Community 15 - "backendRequest"
Cohesion: 0.12
Nodes (42): POST(), reply(), TYPES, postDocuments(), useProfileActions(), addActivity(), addClassTime(), fail() (+34 more)

### Community 16 - "ContactCheckModal.jsx"
Cohesion: 0.15
Nodes (27): contactCheckCopy(), ACTION_ICONS, Buddy(), CHANNEL_ICONS, ChooseStep(), CloseForNow(), CodeStep(), checkTarget() (+19 more)

### Community 17 - "StudentHomeK5.jsx"
Cohesion: 0.11
Nodes (32): CLUE_RING, HIGH_ICONS, K5_PRIMARY_BTN, PlanHeader(), PlanTile(), StatusPills(), SUBJECT_ICONS, PlanChromeContext (+24 more)

### Community 18 - "ClubPage"
Cohesion: 0.07
Nodes (28): ChineseClubPage(), CompetitiveGamingClubPage(), EnglishClubPage(), FocusReactionTrainingClubPage(), FrenchClubPage(), GameStrategyAnalysisClubPage(), GermanClubPage(), GlobalCompetitionsClubPage() (+20 more)

### Community 19 - "AccountForm.jsx"
Cohesion: 0.07
Nodes (50): confirmAndPay(), AccountForm(), handleEmailBlur(), handleSubmit(), refreshCaptcha(), setField(), INITIAL_FIELDS, randomCaptcha() (+42 more)

### Community 20 - "next"
Cohesion: 0.10
Nodes (35): GET(), isStorageHost(), reply(), STORAGE_HOSTS, GET(), reply(), POST(), reply() (+27 more)

### Community 21 - "TranscriptDownloadCard.jsx"
Cohesion: 0.08
Nodes (46): ACCEPTED_TYPES, DocRow(), DocumentUploadPanel(), onUpload(), viewOf(), isPdf(), PreviewImage(), PROFILE_DOC_KEY (+38 more)

### Community 22 - "backendOrigin.js"
Cohesion: 0.21
Nodes (12): BackendSwitcher(), apply(), handlePointerMove(), handleReset(), handleSelectChange(), reclamp(), clampToViewport(), defaultBackendDisplay() (+4 more)

### Community 23 - "hasBackendOrigin"
Cohesion: 0.12
Nodes (49): POST(), SIGNUP_PAGE_TO_STEP, useAddSiblings(), useClubModule(), withSmsAuth(), backendUrl(), enrollAnotherChild(), getAddEnrollmentProcess() (+41 more)

### Community 24 - "Inbox.jsx"
Cohesion: 0.11
Nodes (43): Filters(), FOLDER_ICONS, Folders(), InboxHeader(), K5Inbox(), MessageList(), Row(), RowsSkeleton() (+35 more)

### Community 25 - "inbox.js"
Cohesion: 0.09
Nodes (37): draftFor(), EMPTY_DRAFT, useInboxCompose(), all(), charCount(), COMPOSE_CLOSED, composeProblem(), composeWarnings() (+29 more)

### Community 26 - "FullScreenLoader"
Cohesion: 0.15
Nodes (24): CourseSelectionStep(), StudentEnrollmentStep3Page(), StudentEnrollmentStep2Page(), ParentDetailsStep(), StudentEnrollmentStep4Page(), ReviewAndPaymentStep(), StudentEnrollmentStep1Page(), StudentDetailsStep() (+16 more)

### Community 27 - "react"
Cohesion: 0.19
Nodes (15): AnnouncementsPanel(), formatRelativeAgo(), K5RailButton(), K5AnnouncementsPanel(), K5Drawer(), DUR, EASE_OUT, SPRING (+7 more)

### Community 28 - "floating-label-select.jsx"
Cohesion: 0.10
Nodes (28): buttonVariants, Calendar(), CalendarDayButton(), DatePicker(), canAutoFocusSearch(), k5Label(), K5MobileSheet(), K5PopoverList() (+20 more)

### Community 29 - "PicoGuide.jsx"
Cohesion: 0.09
Nodes (38): GET(), PIXEL, PICO_SAY_EVENT, subscribe(), usePicoLive(), classesTourSteps(), coveredByDialog(), FIXED_PINS (+30 more)

### Community 30 - "MyCertificates.jsx"
Cohesion: 0.12
Nodes (39): MyCertificatesPage(), CapIcon(), CertCardSkeleton(), CertHeader(), K5Certificates(), Overlay(), PILL, RequestDialog() (+31 more)

### Community 31 - "useDummyStudent"
Cohesion: 0.08
Nodes (41): AnnouncementDetailModal(), formatAnnouncementDate(), AnnouncementsWidget(), AttachmentPreviewDialog(), K5AnnouncementDetailModal(), PerformanceGradeHistoryModal(), asArray(), PerformanceProgressModal() (+33 more)

### Community 32 - "K5ProfileEditors.jsx"
Cohesion: 0.12
Nodes (29): VariantToggle(), OfflineForm(), DocSlot(), border(), ChipToggle(), EditableHobbies(), EditableParent(), EditableParents() (+21 more)

### Community 33 - "K5ProfileCustomFields.jsx"
Cohesion: 0.18
Nodes (24): Choice(), ChoiceField(), CustomFields(), DateField(), FileField(), Purpose(), ReadOnlyField(), DOC_TYPE (+16 more)

### Community 34 - "useReEnrollment.js"
Cohesion: 0.18
Nodes (21): eligibilityKey(), eligibilityPollMs(), isCustomPlanUnpaid(), POLLED_SEGMENTS, ReEnrollmentContext, ReEnrollmentProvider(), STATUS_SUCCESS, useResolveReEnrollment() (+13 more)

### Community 35 - "CelebrationHost.jsx"
Cohesion: 0.09
Nodes (34): createBurst(), fivePointStar(), fourPointSparkle(), stepAndDrawBurst(), CanvasBackground(), effects, fitCanvas(), onVisibility() (+26 more)

### Community 36 - "profileEdit.js"
Cohesion: 0.12
Nodes (32): MyProfilePage(), MyProfile(), useProfileEditor(), buildDraft(), buildEditContext(), buildUnits(), countryName(), DATE_FORMAT (+24 more)

### Community 37 - "useStudentCalendar.js"
Cohesion: 0.17
Nodes (24): nowIn(), useK5CalendarModel(), attendanceEntityType(), coveredBy(), getFetchRange(), lazyNeed(), loadStoredPrefs(), monthAsk() (+16 more)

### Community 38 - "K5AttendanceDetails.jsx"
Cohesion: 0.23
Nodes (21): row, addDaysYmd(), customBounds(), FALLBACK_TIMEZONE, formatClassDate(), formatDateTimeInZone(), formatTimeInZone(), fromUtc() (+13 more)

### Community 39 - "K5ProgressReportView.jsx"
Cohesion: 0.15
Nodes (32): BackIcon(), ACT_GRID, ACT_GRID_NO_MODULE, CourseReport(), CourseWareCourse(), gradeTone(), K5ProgressReportView(), Kv() (+24 more)

### Community 40 - "AddStage3ReviewPayment.jsx"
Cohesion: 0.05
Nodes (105): AddStage3ReviewPayment(), checkPaidStatus(), confirmSubmitApplication(), flushPaidStatusPoll(), handleFailure(), launchGateway(), openSectionFor(), startPaidStatusPoll() (+97 more)

### Community 41 - "add-enrollment/PaymentGatewayPickerModal.jsx"
Cohesion: 0.12
Nodes (33): assetUrl(), CardTiles(), CurrencyCard(), Flag(), GatewayActions(), GatewayPanel(), MethodTile(), NO_PAY_BUTTON (+25 more)

### Community 42 - "useStudentDashboardData"
Cohesion: 0.17
Nodes (19): MyClassesGate(), MyClassesPage(), StudentHomePage(), StudentHome(), ContactCheckModal, StudentHomeForGrade(), dayKey(), ForcedPasswordChange() (+11 more)

### Community 43 - "K5PerformanceIcons.jsx"
Cohesion: 0.20
Nodes (16): STREAK_BADGES, ArrowUpIcon(), CalendarIcon(), ChartIcon(), CheckBoxIcon(), Flame(), LOCKED, MEDAL_GLYPH (+8 more)

### Community 44 - "useDashboardContext.js"
Cohesion: 0.19
Nodes (21): parseGradeCache(), readGradeCache(), readSearch(), readSearchOnServer(), studentDashboardDetailsQuery(), subscribe(), useResolveDashboardContext(), useResolveGradeBand() (+13 more)

### Community 45 - "lucide-react"
Cohesion: 0.19
Nodes (24): isAnimatedSource(), isRemoteSource(), OptimizedImage(), ArticleBlock(), NewsAllModal(), NewsDetailModal(), formatNewsDate(), NewsPanel() (+16 more)

### Community 46 - "OnboardingSetup.jsx"
Cohesion: 0.16
Nodes (26): SetupPage(), WelcomePage(), PaymentName(), AcademicStep(), addDays(), BatchReminder(), DoneStep(), errorText() (+18 more)

### Community 47 - "K5BookView.jsx"
Cohesion: 0.12
Nodes (33): AllUsed(), BookArt(), BookHeader(), BookPageSkeleton(), CapTile(), COPY, dayModel(), DayStep() (+25 more)

### Community 48 - "K5Dashboard.jsx"
Cohesion: 0.08
Nodes (44): K5_ROUND_BTN, K5ClockIcon(), Bird(), ClassCard(), ClassesLink(), DashboardSkeleton(), DateStrip(), greeting() (+36 more)

### Community 49 - "payloadEncoding.js"
Cohesion: 0.11
Nodes (24): noStore, POST(), MaintenanceBanner(), EmailVerificationPanel(), handleResend(), buildStage1Request(), useAccountSignup(), withServiceKey() (+16 more)

### Community 50 - "expireSession"
Cohesion: 0.15
Nodes (21): ADD_WIZARD_STEPS, ADD_WIZARD_STEPS_FLEX, AddEnrollmentChrome(), AddWizardFrame(), SEGMENT_TO_STEP_KEY, AddEnrollmentWizardLayout(), NotMappedModal(), AddEnrollmentContext (+13 more)

### Community 51 - "EnrollmentWizardShell.jsx"
Cohesion: 0.08
Nodes (45): ChooseAccountPage(), describe(), metadata, schoolLogo(), AccountCreationForm(), FALLBACK_POLICY_LINKS, FALLBACK_SCHOOL_INFO, AccountCreationPage() (+37 more)

### Community 52 - "useContactCheck.js"
Cohesion: 0.20
Nodes (21): farewellShown, flowFor(), flows, IDLE, idleState(), readPage(), useContactCheck(), buildApi() (+13 more)

### Community 53 - "useStudentCart.js"
Cohesion: 0.24
Nodes (19): CART_KEYS, useAddPlanToCart(), useApplyCartDiscount(), useCartInvalidation(), useRemoveCartItem(), addPlanToCart(), applyCartDiscount(), authHeaders() (+11 more)

### Community 54 - "BookClasses.jsx"
Cohesion: 0.13
Nodes (29): POST(), reply(), BookClassesPage(), useBookSlots(), AllCoursesPickerModal(), BookClasses(), Count(), Notice() (+21 more)

### Community 55 - "useInbox.js"
Cohesion: 0.15
Nodes (27): liveInbox, saveBlob(), sentAsItem(), useInbox(), acknowledgeInboxAnnouncement(), getComposeContacts(), getComposeTemplates(), getEmailSettings() (+19 more)

### Community 56 - "K5Cart.jsx"
Cohesion: 0.19
Nodes (15): BuyExtraClassesPage(), BuyExtraClasses(), add(), CUSTOM_PLAN_NAME, Notice(), PageTitle(), PlanCard(), CustomisePlanModal() (+7 more)

### Community 57 - "ClassFeedbackHost.jsx"
Cohesion: 0.17
Nodes (24): PendingFeedbackPopup(), Stat(), ClassFeedbackHost(), buildEmbedUrl(), buildWebhook(), canShowFeedbackButton(), classDateTimeOf(), dateOf() (+16 more)

### Community 58 - "K5Games.jsx"
Cohesion: 0.07
Nodes (65): GAMES, MEMORY_FACES, newCount(), newMath(), newMemory(), newShape(), numOpts(), playPop() (+57 more)

### Community 59 - "useCourseSelection.js"
Cohesion: 0.21
Nodes (16): buildCourseDetailsRequest(), courseDetailsKey(), isSuccessResponse(), STATUS_SESSION_OUT, STATUS_SUCCESS, useCourseDetails(), useLocalCourseUpdate(), useProceedToReview() (+8 more)

### Community 60 - "GlobalLoader.jsx"
Cohesion: 0.43
Nodes (5): GlobalLoader(), emit(), listeners, trackRequest(), usePendingRequests()

### Community 61 - "AppearanceSettingsPanel.jsx"
Cohesion: 0.11
Nodes (36): useAppearance(), AppearanceSettingsPanel(), Choice(), DayNightSwitch(), DyslexiaSection(), GradeLookSection(), HandChoice(), LOOK_PREVIEW (+28 more)

### Community 62 - "error.jsx"
Cohesion: 0.23
Nodes (15): Error(), ErrorDetails(), ErrorPageFooter(), ErrorPageHeader(), GlobalError(), NotFound(), AuthSessionProvider(), SessionContext (+7 more)

### Community 63 - "Cart.jsx"
Cohesion: 0.24
Nodes (15): CartPage(), CartHeader(), CartItem(), CartSkeleton(), K5CartNotice(), K5CartView(), useCartLook(), Cart() (+7 more)

### Community 64 - "K5AttendanceDetails.jsx"
Cohesion: 0.18
Nodes (12): COLUMNS, DETAILED_LABEL, joinedNote(), K5AttendanceDetails(), rowKind(), Time(), useStudentAttendanceDetails(), getStudentAttendanceDetails() (+4 more)

### Community 65 - "K5Shell.jsx"
Cohesion: 0.11
Nodes (18): AppearanceContext, AppearanceProvider(), HAND_HINT_KEY, parseSaved(), readStorage(), subscribeDark, subscribeReduced, subscribeStorage() (+10 more)

### Community 66 - "student-enroll/FeePaymentPlans.jsx"
Cohesion: 0.25
Nodes (17): AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows(), currencyOf(), CustomPlanTable(), describeMonths(), discountRow() (+9 more)

### Community 67 - "Browser sign-in with SMS tokens (several users per browser)"
Cohesion: 0.25
Nodes (7): Browser sign-in with SMS tokens (several users per browser), Checks, Cookies (all HttpOnly, Secure, SameSite=Lax, Path=/), How a request finds its user, Known limits, Settings, Signing in and out

### Community 68 - "K5ProfileP5.jsx"
Cohesion: 0.12
Nodes (37): fieldLabel(), isMissing(), K5CompleteProfileModal(), SectionBlock(), Badge(), DocumentVerification(), StatusBar(), BADGE (+29 more)

### Community 69 - "add-enrollment/ReviewInlineEdit.jsx"
Cohesion: 0.07
Nodes (82): AddParentDetails(), clearErrors(), handleSubmit(), toggleSameAsStudent(), defaultFields(), ParentRelationFields(), handleRelationChange(), persistOther() (+74 more)

### Community 70 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 71 - "DashboardTopHeader.jsx"
Cohesion: 0.19
Nodes (15): ChangePasswordModal(), PasswordInput(), RULES, DashboardShell(), useWideLayout(), DashboardTopHeader(), RightActionRail(), CartHeaderButton() (+7 more)

### Community 72 - "K5Profile.jsx"
Cohesion: 0.19
Nodes (20): K5PhotoDialog(), AcademicSection(), Avatar(), Chip(), Field(), K5Profile(), Mark(), Note() (+12 more)

### Community 73 - "dummyInbox.js"
Cohesion: 0.13
Nodes (17): useInboxSource(), fresh(), BANDS, buildMessages(), CATEGORY, CHANNEL, contactsOf(), getDummyInbox() (+9 more)

### Community 74 - "PaymentGatewayInitView.jsx"
Cohesion: 0.18
Nodes (14): AirwallexPaymentInitPage(), StripePaymentInitPage(), AirwallexPaymentInitPage(), StripePaymentInitPage(), GATEWAY_CONFIG, getAirwallexCheckoutIntentUrl(), getAirwallexPaymentInitClient(), getFailureMessage() (+6 more)

### Community 75 - "K5InboxCompose.jsx"
Cohesion: 0.21
Nodes (15): K5InboxCompose(), Recipients(), CM_BTN, CM_BTN_PRIMARY, InboxCompose(), Recipients(), EMAIL_SETTINGS_ALWAYS, EMAIL_SETTINGS_INTRO (+7 more)

### Community 76 - "K5NavRail.jsx"
Cohesion: 0.15
Nodes (23): CLUB_ART, ClubMark(), flattenItems(), iconFor(), ICONS, K5NavRail(), NavGroup(), NavLink() (+15 more)

### Community 77 - "PaymentResponseView"
Cohesion: 0.14
Nodes (11): EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage(), PaymentResponseSuccessPage(), RegistrationPaymentResponseSuccessPage(), EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage() (+3 more)

### Community 78 - "useSpeech.js"
Cohesion: 0.21
Nodes (19): BuddyStrip(), SelectToSpeak(), hasSpeech(), noSubscribe(), useSpeech(), voiceOf(), askBackend(), clean() (+11 more)

### Community 79 - "dashboardNav.js"
Cohesion: 0.22
Nodes (14): CompleteProfileModal(), empty(), FieldLine(), label(), SectionBlock(), deriveSegment(), HOME_PAGE_LINKS, iconForLabel() (+6 more)

### Community 80 - "add-enrollment/FeePaymentPlans.jsx"
Cohesion: 0.24
Nodes (18): AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows(), currencyOf(), CustomPlanTable(), describeMonths(), discountRow() (+10 more)

### Community 81 - "K5ProgressReports.jsx"
Cohesion: 0.29
Nodes (11): ProgressReportsPage(), EyeIcon(), GRID, K5ProgressReports(), ReportIcon(), ReportsHeader(), ReportsSkeleton(), dateRange() (+3 more)

### Community 82 - "courseAdvisorApi.js"
Cohesion: 0.30
Nodes (16): required(), useAdvisorChat(), useAdvisorStart(), useAdvisorSuggestions(), useApplySuggestions(), useConfirmMarksheet(), useDismissSuggestions(), applyAdvisorSuggestions() (+8 more)

### Community 83 - "profileModel.js"
Cohesion: 0.27
Nodes (18): buildProfileModel(), CUSTOM_TYPES, DIAL_BY_ISO, dialCode(), DOCS, filled(), fullName(), hhmm() (+10 more)

### Community 84 - "ReEnrollmentOptions.jsx"
Cohesion: 0.22
Nodes (13): ReEnrollmentPage(), K5PassedOptions(), Offer(), DiscountBanner(), HelpCard(), OPTION_BUTTON, pad(), ProgramChips() (+5 more)

### Community 85 - "onboardingGateApi.js"
Cohesion: 0.24
Nodes (19): addMinutes(), bookSystemTraining(), failedAnswer(), fetchLayerDetails(), fetchTrainingSlots(), flagsOf(), getOnboardingStatus(), getSetupDetails() (+11 more)

### Community 86 - "K5Attendance.jsx"
Cohesion: 0.17
Nodes (18): academicYearMonths(), AttendanceHeader(), AttendanceSkeleton(), badgeOf(), buildMonth(), GOLD, K5Attendance(), Medal() (+10 more)

### Community 87 - "useOnboardingGate.js"
Cohesion: 0.35
Nodes (10): guardKey(), ONBOARDING_STATUS_KEY, onboardingDestination(), onboardingTarget(), readGuard(), setupPath(), useOnboardingGate(), welcomePath() (+2 more)

### Community 88 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, @base-ui/react@^1.8.0, cn@^0.3.0, date-fns@^4.4.0, date-fns-tz@^3.2.0, dompurify@^3.2.4, framer-motion@^14.14.0, lucide-react@^1.47.0 (+9 more)

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
Cohesion: 0.18
Nodes (15): TranscriptPage(), K5TableSkeleton(), COLUMNS, DownloadButton(), K5Transcript(), ActionDropdown(), Transcript(), fixable() (+7 more)

### Community 93 - "SystemTrainingPopup.jsx"
Cohesion: 0.20
Nodes (21): K5SystemTrainingRescheduleDialog(), otherPopupOpen(), planFor(), rememberWelcome(), salsa, SystemTrainingPopup(), welcomeKey(), welcomeShown() (+13 more)

### Community 94 - "Skeleton"
Cohesion: 0.31
Nodes (9): ClassFeedbackModal(), DashboardLoadingSkeleton(), HomeBody(), MyClassesBody(), noSubscribe(), PlannerBody(), readSavedHand(), Skeleton() (+1 more)

### Community 95 - "AiAdvisorDialog"
Cohesion: 0.18
Nodes (13): AiAdvisorDialog(), goToQuestions(), handleApply(), handleAsk(), handleConfirmMarks(), handleFiles(), handleSuggest(), loadStart() (+5 more)

### Community 96 - "Re-enrollment — "Download your transcript" card: full handoff"
Cohesion: 0.12
Nodes (15): ReEnrollmentLayout(), ReEnrollmentChrome(), 0. v3 UPDATE (2026-11-20, later) — this section wins over sections 3, 5, 6, 9, 11, 10. Verify before / while coding, 11. Next step, 1. Files made so far, 2. The feature (what the user asked), 3. Decisions (in order they were made) (+7 more)

### Community 97 - "devDependencies"
Cohesion: 0.17
Nodes (10): devDependencies, eslint@^9, @playwright/test@^1.64.1, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^26.6.2, @playwright/test, tailwindcss (+2 more)

### Community 98 - "K5Performance.jsx"
Cohesion: 0.18
Nodes (21): GoalBox(), MyPerformanceCard(), BehindBanner(), Header(), Hero(), K5Performance(), PerformanceSkeleton(), PILLS (+13 more)

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
Cohesion: 0.19
Nodes (21): K5RowsSkeleton(), CourseRow(), salutation(), teacherName(), ACT_GRID, Bar(), GradeHistory(), hms() (+13 more)

### Community 103 - "AppDownloadDialog.jsx"
Cohesion: 0.21
Nodes (10): AppDownloadDialog(), DancingPhone(), FEATURES, SchoolPin(), STEPS, StepsDemo(), StoreCard(), STORES (+2 more)

### Community 104 - "useDashboardContext"
Cohesion: 0.13
Nodes (26): DashboardBody(), DashboardChrome(), DashboardTitle(), isOnboardingPath(), LastPathRecorder(), OnboardingGate(), SessionExpiryWatcher(), ShellForGrade() (+18 more)

### Community 105 - "D3 — Transcript: Diploma link and "(New)" label"
Cohesion: 0.15
Nodes (12): Backend change (additive, one method), D2 and D3 — backend plan (2026-11-14), D2 — Canvas and Courseware report bodies, D3 — Transcript: Diploma link and "(New)" label, Decision (2026-11-14, user), Done, Finding, Frontend (after the backend ships) (+4 more)

### Community 106 - "profileOtpApi.js"
Cohesion: 0.38
Nodes (8): useProfileOtp(), EMAIL_FIELDS, fail(), otpRequest(), PHONE_FIELDS, sendProfileOtp(), verifyProfileOtp(), WHATSAPP_FIELD

### Community 107 - "sheet.jsx"
Cohesion: 0.20
Nodes (8): Sheet(), SheetContent(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SIDE_CLASSES

### Community 108 - "StudentHomeK5.jsx"
Cohesion: 0.07
Nodes (70): SantaBuddy(), INITIAL, isChristmasKey(), listeners, setChristmasPlanner(), CLUES, ColourClues(), PREK_CLUES (+62 more)

### Community 109 - "Image Optimization and Next.js Image Component Rules"
Cohesion: 0.18
Nodes (10): 1. Prefer Next.js Image Component, 2. Image Dimensions and Layout, 3. External and Dynamic Images, 4. Loading and Performance, 5. Special Cases, 6. Mandatory Development Workflow, 7. Preserve Existing Functionality, 8. Project-Wide Enforcement (+2 more)

### Community 110 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, verify:account-auth, verify:contact-check, verify:cookie-domain (+3 more)

### Community 111 - "ReEnrollmentReview.jsx"
Cohesion: 0.21
Nodes (17): ReEnrollmentReviewPage(), Discounts(), FeeBreakdown(), Lines(), Row(), customPlanExtraFees(), CustomPlanSummary(), ReEnrollmentReview() (+9 more)

### Community 112 - "AddStudentDetailsStep.jsx"
Cohesion: 0.15
Nodes (24): AddEnrollmentEntryPage(), AddEnrollmentEntryRedirect(), AddCourseSelectionStep(), AddEnrollmentCourseSelectionPage(), AddEnrollmentStepLoading(), AddParentDetailsStep(), AddEnrollmentParentDetailsPage(), AddReviewAndPaymentStep() (+16 more)

### Community 113 - "layout.js"
Cohesion: 0.12
Nodes (15): caveat, metadata, openSans, RootLayout(), viewport, TAB_ACCOUNT_STORAGE_KEY, TabAccount(), AppToaster() (+7 more)

### Community 114 - "ContactSummaryCard.jsx"
Cohesion: 0.28
Nodes (8): CHANNELS, ContactCheckModal, ContactSummaryCard(), STATUS, TONE, needsAttention(), useContactSummary(), problemsOf()

### Community 115 - "verifyContactCheckFlow.mjs"
Cohesion: 0.11
Nodes (18): EMAIL, MOBILE, ok(), opened(), setup(), WHATSAPP, CONTACT_CHECK_ORDER, createContactCheckFlow() (+10 more)

### Community 116 - "AcademicYearExtension.jsx"
Cohesion: 0.21
Nodes (16): AcademicYearExtensionPage(), AcademicYearExtension(), avail(), openCourse(), buildProceed(), CourseCard(), courseImage(), ExtensionDetail() (+8 more)

### Community 117 - "AI Course Advisor — Rollout Runbook (Phase 6)"
Cohesion: 0.29
Nodes (6): 1. Deploy (once), 2. Live AI check (before switching anything on), 3. Who sees it, 4. Smoke test per stage (about 10 minutes), 5. Metrics (read-only SQL), AI Course Advisor — Rollout Runbook (Phase 6)

### Community 118 - "paymentResponseApi.js"
Cohesion: 0.54
Nodes (7): backendUrl(), buildQuery(), getJson(), getPaymentResponseFailure(), getPaymentResponseSuccess(), getPaymentSettlementStatus(), SUCCESS_ENDPOINTS

### Community 119 - "AddCreatePassword.jsx"
Cohesion: 0.16
Nodes (17): AddEnrollmentCreatePasswordPage(), metadata, AccountSetupSection(), CredRow(), OutlookCredentials(), Step(), AddCreatePassword(), initials() (+9 more)

### Community 120 - "prepareMarksheetFiles"
Cohesion: 0.53
Nodes (5): downscale(), IMAGE_TYPES, isImage(), isPdf(), prepareMarksheetFiles()

### Community 121 - "useStudentLoginHistory.js"
Cohesion: 0.52
Nodes (5): resolveStudentName(), useStudentLoginHistory(), useStudentName(), getStudentAcademicDetails(), getStudentLoginHistory()

### Community 122 - "login-credentials/route.js"
Cohesion: 0.60
Nodes (4): COOKIE_DOMAINS, encodeCookieValue(), POST(), sharedCookieDomain()

### Community 123 - "LoginHistory.jsx"
Cohesion: 0.16
Nodes (17): LoginHistoryPage(), SyllabusPage(), COLUMNS, K5LoginHistory(), LoginHeader(), LoginSkeleton(), PageButton(), SummaryTile() (+9 more)

### Community 126 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): eslintConfig, eslint-config-next@16.3.5, eslint, eslint-config-next

### Community 134 - "K5Header.jsx"
Cohesion: 0.16
Nodes (21): GroupItem(), iconFor(), ICONS, LinkItem(), Sidebar(), HeaderAvatar(), K5Header(), MenuItem() (+13 more)

### Community 135 - "ReserveSeatForNextGrade.jsx"
Cohesion: 0.26
Nodes (13): AppInstallPrompt(), dismissedUntilNow(), rememberDismissed(), runsAsInstalledApp(), storageKey(), subscribeNothing(), Credential(), OutlookReminder() (+5 more)

### Community 136 - "PaymentInProgressModal.jsx"
Cohesion: 0.32
Nodes (11): continueHref(), devicePhrase(), expiryLine(), formatDay(), formatTime(), Option(), parseInstant(), PaymentInProgressModal() (+3 more)

### Community 137 - "sessionState.js"
Cohesion: 0.18
Nodes (17): QueryProvider(), useDashboardSessionExpiry(), ask(), fetchRoute(), say(), isPageRequest(), stillSignedIn(), useNavigationSessionGuard() (+9 more)

### Community 138 - "k5Bits.jsx"
Cohesion: 0.15
Nodes (28): HighIcon(), highIconKey(), SubjectIcon(), SubjectTile(), ClassTile(), MyCourses(), asArray(), CourseContentDialog() (+20 more)

### Community 139 - "K5ClassesHeader.jsx"
Cohesion: 0.44
Nodes (7): ChristmasLights(), ChristmasTreeIcon(), ColourPicture(), K5ClassesHeader(), LineCalendar(), useSecondClock(), zoneLabel()

### Community 140 - "8. Phases"
Cohesion: 0.22
Nodes (9): 8. Phases, Phase 0: Groundwork, Phase 1: Context builder and validator (server, read-only), Phase 2: Marksheet, Phase 3: Recommend and apply (server), Phase 4: Frontend and AI transitions, Phase 5: Chat (`COURSE_ADVISOR_CHAT_ENABLED`), Phase 6: Rollout (+1 more)

### Community 141 - "K5BrainBreak.jsx"
Cohesion: 0.24
Nodes (13): BreakDialog(), Cloud(), Footprints(), Glass(), K5BrainBreak(), Shoe(), Star(), Tick() (+5 more)

### Community 142 - "date-fns"
Cohesion: 0.15
Nodes (29): ActivityDetailsModal(), Countdown(), pad(), isJoinableClass(), StudentCalendarCard(), titleFor(), VIEW_TABS, CalendarClockPill() (+21 more)

### Community 143 - "Inbox"
Cohesion: 0.38
Nodes (5): InboxComposePage(), InboxPage(), Inbox(), PlainFilters(), InboxSettings()

### Community 145 - "ShapeLayer.js"
Cohesion: 0.53
Nodes (5): cloud(), createShapes(), pickKind(), star(), stepAndDrawShapes()

### Community 146 - "verifyPaymentAttemptRecovery.mjs"
Cohesion: 0.20
Nodes (6): newYork, source, alreadyPaid, attempt, otherBrowser, unavailable

### Community 147 - "Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)"
Cohesion: 0.22
Nodes (8): 1. Project in one paragraph, 3. How things are wired (quick map), 4. Status — what is DONE (all committed by the user, up to is-sms "Student New Dashboard Part 31"), 5. NOT verified because the Java backend (8080) was down — do these first once it runs, 6. What is LEFT (not code-blocked), 7. Testing how-to, 8. Open decisions / things to ask the user, Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)

### Community 148 - "[school]/page.jsx"
Cohesion: 0.43
Nodes (5): SchoolBasePage(), SCHOOL_URLS, DASHBOARD_ROLES, LAST_DASHBOARD_PATH_COOKIE, safeDashboardPath()

### Community 150 - "profileApi.js"
Cohesion: 0.35
Nodes (7): useStudentProfile(), getMyProfile(), idOf(), loadPlaceNames(), loadWithdrawalEligibility(), unique(), createDummyProfileAnswer()

### Community 151 - "marketingConsent.js"
Cohesion: 0.33
Nodes (9): ConsentBanner(), Switch(), CONSENT_COOKIE, deleteMetaCookies(), expire(), META_COOKIES, subscribe(), useMarketingConsent() (+1 more)

### Community 153 - "Attendance.jsx"
Cohesion: 0.29
Nodes (9): AttendancePage(), Attendance(), Chart, Delta(), MonthlyChart(), MONTHS, StatCard(), SUMMARY (+1 more)

### Community 154 - "campaignCookies.js"
Cohesion: 0.24
Nodes (14): CampaignCookieInitializer(), captureMetaCookies(), getCampaignCookie(), getCookie(), getUrlParam(), initializeCampaignCookies(), isCookieEmpty(), readRawCookie() (+6 more)

### Community 156 - "K5ProfileEditorsP3.jsx"
Cohesion: 0.29
Nodes (11): ClubChip(), EditableCallingTimes(), EditableSports(), EditableTiming(), SlotChip(), startOfToday(), TIME_OPTIONS, timeLabel() (+3 more)

### Community 157 - "diaryClient.js"
Cohesion: 0.25
Nodes (12): RailButton(), RightActionRailContent(), pollers, startPoller(), poll(), useDiaryLivePolling(), askDiary(), getDiaryBadgeVersion() (+4 more)

### Community 158 - "cookieDomain.js"
Cohesion: 0.32
Nodes (10): assert(), assertCandidates(), prod, candidateCookieDomains(), COOKIE_MAX_AGE_DAYS, cookieAttributes(), domainIsAccepted(), resolveCookieDomain() (+2 more)

### Community 159 - "useAddSiblings.js"
Cohesion: 0.38
Nodes (5): DEFAULT_ATTENDANCE_CUSTOM_RANGE_DAYS, useAttendanceCustomRangeDays(), useFeedbackSetting(), getNumericSettingByTypeAndKey(), getSettingsByTypeAndKey()

### Community 160 - "logout.js"
Cohesion: 0.15
Nodes (17): page(), WizardLayout(), SEGMENT_TO_STEP_KEY, WizardChrome(), WizardFrame(), OnboardingFrame(), OnboardingShell(), useBackendSessionGuard() (+9 more)

### Community 161 - "getLearningProgramRouteCode"
Cohesion: 0.60
Nodes (4): EnrollRedirect(), decodePayload(), EnrollPage(), getFirstValue()

### Community 162 - "AnalyticsScripts.jsx"
Cohesion: 0.27
Nodes (9): AnalyticsScripts(), EnrollmentPixel(), isEnrollmentPath(), loadPixel(), collectMetaParams(), getClientIp(), LEADS_API_BASE_URL, MetaParamBuilder() (+1 more)

### Community 163 - "useSystemTrainingReschedule.js"
Cohesion: 0.48
Nodes (6): nextDay(), splitDateTime(), useSystemTrainingReschedule(), confirm(), save(), ymdToPickerDate()

### Community 164 - "StudentHandbook.jsx"
Cohesion: 0.29
Nodes (8): StudentHandbookPage(), assetUrl(), StudentHandbook(), 6. Design summary, Backend, Payment flow seen in the real app, findModuleId(), useModuleRights()

### Community 166 - "Performance.jsx"
Cohesion: 0.14
Nodes (18): PerformancePage(), PurchasedPlans(), MobileTableCard(), assetUrl(), DETAILED_PROVIDERS, formatPercent(), PACE, Pace() (+10 more)

### Community 170 - "package.json"
Cohesion: 0.17
Nodes (11): apexcharts@^8.6.0, class-variance-authority@^0.7.1, react-day-picker@^10.0.1, tw-animate-css@^1.4.0, name, private, version, apexcharts (+3 more)

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `k5PerformanceData.js`, `add-enrollment/ReviewInlineEdit.jsx`, `Stage3CourseSelection.jsx`, `calendarEvents.js`, `VideoLibrary.jsx`, `useReEnrollment.js`, `PaymentResponseView.jsx`, `K5BookedView.jsx`, `AddStage2CourseSelection.jsx`, `DialogContent`, `K5Shell.jsx`, `usePicoContentReady`, `K5DiaryPanel.jsx`, `backendRequest`, `ContactCheckModal.jsx`, `StudentHomeK5.jsx`, `ClubPage`, `AccountForm.jsx`, `TranscriptDownloadCard.jsx`, `backendOrigin.js`, `hasBackendOrigin`, `Inbox.jsx`, `inbox.js`, `FullScreenLoader`, `floating-label-select.jsx`, `PicoGuide.jsx`, `MyCertificates.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `K5ProfileCustomFields.jsx`, `useReEnrollment.js`, `CelebrationHost.jsx`, `profileEdit.js`, `useStudentCalendar.js`, `K5ProgressReportView.jsx`, `AddStage3ReviewPayment.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `useStudentDashboardData`, `useDashboardContext.js`, `lucide-react`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `payloadEncoding.js`, `expireSession`, `EnrollmentWizardShell.jsx`, `useContactCheck.js`, `BookClasses.jsx`, `useInbox.js`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `K5Games.jsx`, `GlobalLoader.jsx`, `AppearanceSettingsPanel.jsx`, `error.jsx`, `Cart.jsx`, `K5AttendanceDetails.jsx`, `K5Shell.jsx`, `student-enroll/FeePaymentPlans.jsx`, `K5ProfileP5.jsx`, `add-enrollment/ReviewInlineEdit.jsx`, `DashboardTopHeader.jsx`, `K5Profile.jsx`, `PaymentGatewayInitView.jsx`, `K5InboxCompose.jsx`, `K5NavRail.jsx`, `useSpeech.js`, `dashboardNav.js`, `add-enrollment/FeePaymentPlans.jsx`, `K5ProgressReports.jsx`, `ReEnrollmentOptions.jsx`, `K5Attendance.jsx`, `useOnboardingGate.js`, `dependencies`, `AiAdvisorDialog.jsx`, `ChristmasProvider.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `Skeleton`, `K5Performance.jsx`, `K5PerformanceCompare.jsx`, `K5PerformanceCourseView.jsx`, `AppDownloadDialog.jsx`, `useDashboardContext`, `profileOtpApi.js`, `sheet.jsx`, `StudentHomeK5.jsx`, `ReEnrollmentReview.jsx`, `AddStudentDetailsStep.jsx`, `layout.js`, `ContactSummaryCard.jsx`, `AcademicYearExtension.jsx`, `AddCreatePassword.jsx`, `LoginHistory.jsx`, `K5Header.jsx`, `ReserveSeatForNextGrade.jsx`, `PaymentInProgressModal.jsx`, `sessionState.js`, `k5Bits.jsx`, `K5ClassesHeader.jsx`, `K5BrainBreak.jsx`, `date-fns`, `profileApi.js`, `marketingConsent.js`, `campaignCookies.js`, `K5ProfileEditorsP3.jsx`, `diaryClient.js`, `logout.js`, `getLearningProgramRouteCode`, `AnalyticsScripts.jsx`, `useSystemTrainingReschedule.js`, `Performance.jsx`, `package.json`?**
  _High betweenness centrality (0.266) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useDummyStudent()` (e.g. with `Phase 0 — foundation (blocks everything else)` and `readSearch()`) actually correct?**
  _`useDummyStudent()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `k5PerformanceData.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14015151515151514 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `date-fns` to `k5PerformanceData.js`, `add-enrollment/ReviewInlineEdit.jsx`, `Stage3CourseSelection.jsx`, `calendarEvents.js`, `VideoLibrary.jsx`, `useReEnrollment.js`, `PaymentResponseView.jsx`, `K5BookedView.jsx`, `AddStage2CourseSelection.jsx`, `DialogContent`, `K5Shell.jsx`, `usePicoContentReady`, `K5DiaryPanel.jsx`, `ContactCheckModal.jsx`, `StudentHomeK5.jsx`, `ClubPage`, `AccountForm.jsx`, `TranscriptDownloadCard.jsx`, `backendOrigin.js`, `Inbox.jsx`, `react`, `floating-label-select.jsx`, `PicoGuide.jsx`, `MyCertificates.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `K5ProfileCustomFields.jsx`, `K5ProgressReportView.jsx`, `AddStage3ReviewPayment.jsx`, `add-enrollment/PaymentGatewayPickerModal.jsx`, `useStudentDashboardData`, `lucide-react`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `payloadEncoding.js`, `EnrollmentWizardShell.jsx`, `BookClasses.jsx`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `K5Games.jsx`, `AppearanceSettingsPanel.jsx`, `Cart.jsx`, `K5AttendanceDetails.jsx`, `student-enroll/FeePaymentPlans.jsx`, `K5ProfileP5.jsx`, `add-enrollment/ReviewInlineEdit.jsx`, `DashboardTopHeader.jsx`, `K5Profile.jsx`, `PaymentGatewayInitView.jsx`, `K5InboxCompose.jsx`, `K5NavRail.jsx`, `useSpeech.js`, `dashboardNav.js`, `add-enrollment/FeePaymentPlans.jsx`, `K5ProgressReports.jsx`, `ReEnrollmentOptions.jsx`, `dependencies`, `AiAdvisorDialog.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `Skeleton`, `AppDownloadDialog.jsx`, `useDashboardContext`, `sheet.jsx`, `StudentHomeK5.jsx`, `ReEnrollmentReview.jsx`, `AddStudentDetailsStep.jsx`, `ContactSummaryCard.jsx`, `AcademicYearExtension.jsx`, `AddCreatePassword.jsx`, `LoginHistory.jsx`, `K5Header.jsx`, `ReserveSeatForNextGrade.jsx`, `PaymentInProgressModal.jsx`, `k5Bits.jsx`, `K5BrainBreak.jsx`, `Attendance.jsx`, `K5ProfileEditorsP3.jsx`, `StudentHandbook.jsx`, `Performance.jsx`, `package.json`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Should `add-enrollment/ReviewInlineEdit.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07199032062915911 - nodes in this community are weakly interconnected._
- **Why does `useDashboardContext()` connect `useDashboardContext` to `VideoLibrary.jsx`, `K5Header.jsx`, `ReserveSeatForNextGrade.jsx`, `K5BookedView.jsx`, `DialogContent`, `K5ClassesHeader.jsx`, `k5Bits.jsx`, `K5BrainBreak.jsx`, `date-fns`, `K5DiaryPanel.jsx`, `ContactCheckModal.jsx`, `StudentHomeK5.jsx`, `K5Shell.jsx`, `usePicoContentReady`, `ClubPage`, `Inbox`, `profileApi.js`, `hasBackendOrigin`, `Inbox.jsx`, `Attendance.jsx`, `PicoGuide.jsx`, `MyCertificates.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `logout.js`, `CelebrationHost.jsx`, `profileEdit.js`, `StudentHandbook.jsx`, `Performance.jsx`, `K5ProgressReportView.jsx`, `useSystemTrainingReschedule.js`, `useStudentDashboardData`, `useDashboardContext.js`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `K5Dashboard.jsx`, `useContactCheck.js`, `BookClasses.jsx`, `useInbox.js`, `K5Cart.jsx`, `ClassFeedbackHost.jsx`, `AppearanceSettingsPanel.jsx`, `Cart.jsx`, `K5AttendanceDetails.jsx`, `K5Shell.jsx`, `DashboardTopHeader.jsx`, `dummyInbox.js`, `K5NavRail.jsx`, `K5ProgressReports.jsx`, `ReEnrollmentOptions.jsx`, `K5Attendance.jsx`, `ChristmasProvider.jsx`, `Transcript.jsx`, `SystemTrainingPopup.jsx`, `K5Performance.jsx`, `K5PerformanceCourseView.jsx`, `StudentHomeK5.jsx`, `ContactSummaryCard.jsx`, `AcademicYearExtension.jsx`, `LoginHistory.jsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `Stage3CourseSelection.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._