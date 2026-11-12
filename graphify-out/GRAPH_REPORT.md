# Graph Report - is-sms  (2026-11-12)

## Corpus Check
- 585 files · ~392,190 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: .css 6, (none) 3, .example 1)

## Summary
- 3537 nodes · 12712 edges · 130 communities (120 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 134 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e836493`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- OptimizedImage
- OnboardingSetup.jsx
- K5BookView.jsx
- VideoLibrary.jsx
- createDummyStudent
- layout.js
- session.js
- react-hot-toast
- Stage3CourseSelection.jsx
- k5Calendar.js
- useAddEnrollmentContext.js
- ClubPage
- add-enrollment/ReviewInlineEdit.jsx
- CalendarCard.jsx
- K5AttendanceDetails.jsx
- profileEdit.js
- parentHome.js
- DialogContent
- Cart.jsx
- useSelectedChild
- react
- PaymentResponseView.jsx
- useDummyStudent
- getAccountSession
- hasBackendOrigin
- K5ProfileEditors.jsx
- AddStage2CourseSelection
- ParentProgressReports.jsx
- K5ProfileCustomFields.jsx
- AddStage3ReviewPayment.jsx
- lucide-react
- resolveBackendOrigin
- backendRequest
- MyCertificates.jsx
- Stage4ReviewPayment.jsx
- package.json
- useDashboardContext
- DatePicker
- student-enroll/ReviewInlineEdit.jsx
- Stage2ParentDetails.jsx
- PaymentGatewayInitView.jsx
- studentSignupBackendApi.js
- expireSession
- k5Bits.jsx
- ParentAcademicPerformance.jsx
- AddParentDetails.jsx
- K5Games.jsx
- payloadEncoding.js
- date-fns
- K5Performance.jsx
- k5PerformanceData.js
- calendarEvents.js
- useDashboardContext.js
- loginPageUrl
- ProgressReportView.jsx
- FullScreenLoader
- AccountForm.jsx
- next
- backendOrigin.js
- K5PerformanceCourseView.jsx
- K5Profile.jsx
- student-enroll/FeePaymentPlans.jsx
- StudentHomeK5.jsx
- withSmsAuth
- useCartCheckout
- useAppearance
- error.jsx
- components.json
- callLocationForPaymentPromise
- K5Toolbar.jsx
- useStudentCart.js
- PaymentResponseView
- picoEvents.js
- add-enrollment/FeePaymentPlans.jsx
- profileModel.js
- AddCreatePassword.jsx
- LoginHistory.jsx
- learningProgramTheme.js
- dashboardNav.js
- AiAdvisorDialog.jsx
- courseAdvisorApi.js
- ParentAttendance.jsx
- K5NavRail.jsx
- K5Attendance.jsx
- AiAdvisorDialog
- devDependencies
- AcademicYearExtension.jsx
- K5Shell.jsx
- K5PerformanceIcons.jsx
- FeeDetails.jsx
- verifyAccountAuth.mjs
- AppDownloadDialog.jsx
- K5PerformanceCompare.jsx
- PaymentInProgressModal.jsx
- 5. Progress
- FloatingLabelSelect
- AddParentDetails
- Attendance.jsx
- Transcript.jsx
- AccountCreationForm.jsx
- sheet.jsx
- parentDashboardApi.js
- useReEnrollmentGateway.jsx
- Image Optimization and Next.js Image Component Rules
- useIntlTelInput
- K5Header.jsx
- AI Course Advisor — Implementation Plan
- profileOtpApi.js
- k5Fonts.js
- 8. Phases
- useStudentProfile.js
- scripts
- [school]/page.jsx
- useSpeech.js
- navigateTop
- paymentResponseApi.js
- AI Course Advisor — Rollout Runbook (Phase 6)
- ExamDetails.jsx
- K5CompleteProfileModal.jsx
- prepareMarksheetFiles
- verifyIpLocation.mjs
- AGENTS.md
- instrumentation.js
- compilerOptions
- serverApi.js
- vercel.json
- LocationConstant.js
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `react` - 214 edges
2. `useDashboardContext()` - 150 edges
3. `lucide-react` - 149 edges
4. `hasBackendOrigin()` - 111 edges
5. `useDummyStudent()` - 106 edges
6. `next` - 104 edges
7. `DialogContent()` - 93 edges
8. `Dialog()` - 90 edges
9. `DialogTitle()` - 89 edges
10. `@tanstack/react-query` - 85 edges

## Surprising Connections (you probably didn't know these)
- `Phase 4 — transactional flows` --references--> `showDummyStripeCheckoutPage()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → utils/paymentGatewayChecks.js
- `Modules already migrated to Next (need dummy support)` --references--> `DiaryPanel()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → components/dashboard/DiaryPanel.jsx
- `Modules already migrated to Next (need dummy support)` --references--> `NewsPanel()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → components/dashboard/NewsPanel.jsx
- `7. Frontend (`is-sms`), render only` --references--> `AiSuggesterCard()`  [INFERRED]
  docs/ai-course-advisor-plan.md → components/student-enroll/ai-advisor/AiSuggesterCard.jsx
- `5. Progress` --references--> `useCartCheckout()`  [INFERRED]
  docs/migration/dummy-student-mode-plan.md → hooks/useCartCheckout.js

## Import Cycles
- 2-file cycle: `components/k5/pages/K5ProfileEditors.jsx -> components/k5/pages/K5ProfileEditorsP3.jsx -> components/k5/pages/K5ProfileEditors.jsx`

## Communities (130 total, 10 thin omitted)

### Community 0 - "OptimizedImage"
Cohesion: 0.05
Nodes (81): assetUrl(), CardTiles(), CurrencyCard(), Flag(), GatewayActions(), GatewayPanel(), MethodTile(), NO_PAY_BUTTON (+73 more)

### Community 1 - "OnboardingSetup.jsx"
Cohesion: 0.06
Nodes (84): SetupPage(), WelcomePage(), PaymentName(), BADGE, BANK, BankForm(), BankSummary(), clean() (+76 more)

### Community 2 - "K5BookView.jsx"
Cohesion: 0.05
Nodes (76): BookClassesPage(), COLUMNS, DATE_TYPES, DEFAULT_FILTER, initialsOf(), K5BookedView(), apply(), reset() (+68 more)

### Community 3 - "VideoLibrary.jsx"
Cohesion: 0.08
Nodes (73): VideoLibraryPage(), AccessBar(), CourseChips(), K5VideoLibrary(), ModuleHeading(), Row(), Stage(), tint() (+65 more)

### Community 4 - "createDummyStudent"
Cohesion: 0.08
Nodes (74): ACTIVITY_ROWS, ASSIGNMENT_KINDS, backendDate(), cleanCourseName(), courseCategoryForName(), createDummyStudent(), academicGradeHistory(), academicPerformanceRows() (+66 more)

### Community 5 - "layout.js"
Cohesion: 0.06
Nodes (54): caveat, metadata, openSans, RootLayout(), viewport, AnalyticsScripts(), TabAccount(), CampaignCookieInitializer() (+46 more)

### Community 6 - "session.js"
Cohesion: 0.09
Nodes (58): POST(), GET(), safeReturn(), GET, handleSsoHandoff(), POST, redirectTo(), safeAddEnrollmentPath() (+50 more)

### Community 7 - "react-hot-toast"
Cohesion: 0.09
Nodes (54): ReEnrollmentCourseSelectionPage(), ReEnrollmentPage(), ReEnrollmentPaymentPage(), ReEnrollmentReviewPage(), ReEnrollmentCourseSelection(), DiscountBanner(), OPTION_BUTTON, ReEnrollmentOptions() (+46 more)

### Community 8 - "Stage3CourseSelection.jsx"
Cohesion: 0.07
Nodes (52): getGradeBand(), selectedSummary(), SkeletonBlock(), Stage3Skeleton(), useIsMobile(), MarksheetTable(), update(), AiSuggesterCard() (+44 more)

### Community 9 - "k5Calendar.js"
Cohesion: 0.10
Nodes (50): CLUES, PREK_CLUES, ActivityCard(), ASSIGNMENT_PILL, Assignments(), CARD_STATE, ClassCard(), CLUE_FOR_STATUS (+42 more)

### Community 10 - "useAddEnrollmentContext.js"
Cohesion: 0.11
Nodes (37): AddEnrollmentEntryPage(), AddEnrollmentEntryRedirect(), ADD_WIZARD_STEPS, ADD_WIZARD_STEPS_FLEX, AddEnrollmentChrome(), AddWizardFrame(), SEGMENT_TO_STEP_KEY, AddCourseSelectionStep() (+29 more)

### Community 11 - "ClubPage"
Cohesion: 0.08
Nodes (26): ChineseClubPage(), CompetitiveGamingClubPage(), EnglishClubPage(), FocusReactionTrainingClubPage(), FrenchClubPage(), GameStrategyAnalysisClubPage(), GermanClubPage(), GlobalCompetitionsClubPage() (+18 more)

### Community 12 - "add-enrollment/ReviewInlineEdit.jsx"
Cohesion: 0.09
Nodes (39): WORKING_PROFESSION_OPTIONS, AddStage1StudentDetails(), handleSubmit(), FieldSkeleton(), GENDER_OPTIONS, INITIAL_FIELDS, LEARNING_PROGRAMS, Stage1Skeleton() (+31 more)

### Community 13 - "CalendarCard.jsx"
Cohesion: 0.09
Nodes (41): isJoinableClass(), StudentCalendarCard(), titleFor(), VIEW_TABS, CalendarClockPill(), getTimeOfDay(), TIME_OF_DAY_STYLE, CalendarDatepicker() (+33 more)

### Community 14 - "K5AttendanceDetails.jsx"
Cohesion: 0.10
Nodes (41): COLUMNS, DETAILED_LABEL, joinedNote(), K5AttendanceDetails(), rowKind(), Time(), QueryProvider(), DEFAULT_ATTENDANCE_CUSTOM_RANGE_DAYS (+33 more)

### Community 15 - "profileEdit.js"
Cohesion: 0.09
Nodes (41): MyProfilePage(), MyProfile(), useProfileEditor(), authentication(), clean(), FIELDS, getProfileMaster(), MASTER_FIELD (+33 more)

### Community 16 - "parentHome.js"
Cohesion: 0.12
Nodes (36): ParentHomePage(), RAIL_OPEN_EVENT, TodaySession(), TONES, BarChart(), PAD, ChildOverviewCard(), Tile() (+28 more)

### Community 17 - "DialogContent"
Cohesion: 0.14
Nodes (33): FlaggedSeatsModal(), InfoModal(), LogoutConfirmDialog(), EditCard(), LiveClassAlert(), startedAgo(), AppearanceDialog(), K5TermsDialog() (+25 more)

### Community 18 - "Cart.jsx"
Cohesion: 0.12
Nodes (33): CartPage(), BuyExtraClassesPage(), BuyHeader(), gradeLabel(), K5BuyExtraClasses(), K5BuyExtraNotice(), PlanCard(), CartHeader() (+25 more)

### Community 19 - "useSelectedChild"
Cohesion: 0.10
Nodes (32): ParentLayout(), Page(), ParentAssignedTeachersPage(), ChildAvatar(), ChildPicker(), ChildTabs(), firstName(), gradeLabel() (+24 more)

### Community 20 - "react"
Cohesion: 0.12
Nodes (28): CourseSelectionStep(), StudentEnrollmentStep3Page(), StudentEnrollmentStep2Page(), ParentDetailsStep(), StudentEnrollmentStep4Page(), ReviewAndPaymentStep(), StudentEnrollmentStep1Page(), StudentDetailsStep() (+20 more)

### Community 21 - "PaymentResponseView.jsx"
Cohesion: 0.11
Nodes (43): AccountInfoCard(), AddEnrollmentAccountInfo(), AddEnrollmentThankYouReplay(), buildRedirectHref(), CircularCountdown(), ConfirmingCard(), ContactEmail(), CopyButton() (+35 more)

### Community 22 - "useDummyStudent"
Cohesion: 0.13
Nodes (23): AnnouncementDetailModal(), formatAnnouncementDate(), AnnouncementsWidget(), AttachmentPreviewDialog(), K5AnnouncementDetailModal(), useParentRailCounts(), SIGNUP_PAGE_TO_STEP, readSearch() (+15 more)

### Community 23 - "getAccountSession"
Cohesion: 0.14
Nodes (28): GET(), GET(), GET(), reportDataOwners(), useParentAttendanceDetails(), serviceKeyHeaders(), getAccountSession(), smsAuthHeaders() (+20 more)

### Community 24 - "hasBackendOrigin"
Cohesion: 0.17
Nodes (38): POST(), authHeaders(), changePassword(), getAcademicYearExtension(), getChatUnseenCount(), getClassJoinDetails(), getDashboardMenu(), getDashboardUserDetails() (+30 more)

### Community 25 - "K5ProfileEditors.jsx"
Cohesion: 0.14
Nodes (36): border(), ChipToggle(), EditableHobbies(), EditableParent(), EditableParents(), EditablePersonal(), EditableSocial(), EditDate() (+28 more)

### Community 26 - "AddStage2CourseSelection"
Cohesion: 0.09
Nodes (31): AddStage2CourseSelection(), addSubject(), applyChange(), ask(), confirmRecommended(), handleAiApplied(), handleFailure(), handleGradeChange() (+23 more)

### Community 27 - "ParentProgressReports.jsx"
Cohesion: 0.10
Nodes (31): ParentProgressPage(), HEADERS, ParentProgressReports(), ProgressForChild(), StatusText(), assetUrl(), DetailRows(), downloadQuery() (+23 more)

### Community 28 - "K5ProfileCustomFields.jsx"
Cohesion: 0.12
Nodes (28): VariantToggle(), OfflineForm(), Choice(), ChoiceField(), CustomFields(), DateField(), FileField(), Purpose() (+20 more)

### Community 29 - "AddStage3ReviewPayment.jsx"
Cohesion: 0.10
Nodes (33): AddStage3ReviewPayment(), checkPaidStatus(), confirmSubmitApplication(), flushPaidStatusPoll(), handleFailure(), openSectionFor(), startPaidStatusPoll(), stopPaidStatusPoll() (+25 more)

### Community 30 - "lucide-react"
Cohesion: 0.14
Nodes (18): ChangeGradeDialog(), handleSave(), ConfirmDialog(), RecommendedCoursesDialog(), ChangeGradeDialog(), handleSave(), ConfirmDialog(), EmailValidatorModal() (+10 more)

### Community 31 - "resolveBackendOrigin"
Cohesion: 0.10
Nodes (29): ProgressReportsPage(), PerformancePage(), assetUrl(), MobileTableCard(), assetUrl(), DETAILED_PROVIDERS, formatPercent(), PACE (+21 more)

### Community 32 - "backendRequest"
Cohesion: 0.18
Nodes (30): POST(), reply(), TYPES, postDocuments(), useProfileActions(), addActivity(), addClassTime(), fail() (+22 more)

### Community 33 - "MyCertificates.jsx"
Cohesion: 0.14
Nodes (31): MyCertificatesPage(), CapIcon(), K5Certificates(), Overlay(), PILL, RequestDialog(), Seal(), Track() (+23 more)

### Community 34 - "Stage4ReviewPayment.jsx"
Cohesion: 0.11
Nodes (30): finishEdit(), launchGateway(), Collapse(), MONTHS_BY_PAY_MODE, PAY_MODE_BY_KEY, PAY_MODE_BY_MONTHS, PaymentOptionsSkeleton(), phoneLine() (+22 more)

### Community 35 - "package.json"
Cohesion: 0.07
Nodes (34): dependencies, apexcharts@^8.6.0, @base-ui/react@^1.8.0, class-variance-authority@^0.7.1, cn@^0.3.0, date-fns@^4.4.0, date-fns-tz@^3.2.0, dompurify@^3.2.4 (+26 more)

### Community 36 - "useDashboardContext"
Cohesion: 0.12
Nodes (22): ParentFeeDetailsPage(), StudentHandbookPage(), SyllabusPage(), PermissionGate(), useHasPermission(), feeAction(), receiptHref(), RETRY_STATUSES (+14 more)

### Community 37 - "DatePicker"
Cohesion: 0.12
Nodes (20): DatePicker(), canAutoFocusSearch(), k5Label(), k5Trigger(), MobileSelectSheet(), PlainFloatingLabelSelect(), SearchableFloatingLabelSelect(), handleOpenChange() (+12 more)

### Community 38 - "student-enroll/ReviewInlineEdit.jsx"
Cohesion: 0.16
Nodes (23): PhoneNumberField(), ParentInlineEdit(), StudentInlineEdit(), save(), useSaveOutcome(), FieldSkeleton(), GENDER_OPTIONS, INITIAL_FIELDS (+15 more)

### Community 39 - "Stage2ParentDetails.jsx"
Cohesion: 0.11
Nodes (23): ParentInlineEdit(), save(), Req(), RequiredAsterisk(), save(), defaultFields(), RELATION_OPTIONS, Stage2ParentDetails() (+15 more)

### Community 40 - "PaymentGatewayInitView.jsx"
Cohesion: 0.13
Nodes (21): AirwallexPaymentInitPage(), StripePaymentInitPage(), AirwallexEmbeddedPage(), AirwallexPaymentInitPage(), StripeEmbeddedPage(), StripePaymentInitPage(), loadStripeSdk(), mountAirwallex() (+13 more)

### Community 41 - "studentSignupBackendApi.js"
Cohesion: 0.12
Nodes (28): page(), useSignupStageStatusPoll(), backendUrl(), cancelPaymentAttempt(), choosePaymentPlan(), eligibleForEdit(), getCommonScriptVariables(), getParentDetails() (+20 more)

### Community 42 - "expireSession"
Cohesion: 0.15
Nodes (21): WizardLayout(), SEGMENT_TO_STEP_KEY, WizardChrome(), WizardFrame(), ReEnrollmentLayout(), Frame(), ReEnrollmentChrome(), OnboardingFrame() (+13 more)

### Community 43 - "k5Bits.jsx"
Cohesion: 0.16
Nodes (26): K5_ROUND_BTN, SUBJECT_ICONS, SubjectIcon(), dotColor(), MyCourses(), TodayRow(), WEEK_LETTERS, asArray() (+18 more)

### Community 44 - "ParentAcademicPerformance.jsx"
Cohesion: 0.16
Nodes (24): ParentAcademicPerformancePage(), ParentMobileTableCard(), assetUrl(), Pace(), ParentAcademicPerformance(), PerformanceBody(), ProgressBar(), ParentGradeHistoryModal() (+16 more)

### Community 45 - "AddParentDetails.jsx"
Cohesion: 0.22
Nodes (27): ParentRelationFields(), handleRelationChange(), persistOther(), RELATION_OPTIONS, ParentRelationFields(), handleRelationChange(), persistOther(), buildAdditionalParent() (+19 more)

### Community 46 - "K5Games.jsx"
Cohesion: 0.16
Nodes (26): GAMES, MEMORY_FACES, newCount(), newMath(), newMemory(), newShape(), numOpts(), playPop() (+18 more)

### Community 47 - "payloadEncoding.js"
Cohesion: 0.12
Nodes (20): withServiceKey(), body, request, noPlusResult, plusResult, roundTrip(), createAddEnrollmentPassword(), login() (+12 more)

### Community 48 - "date-fns"
Cohesion: 0.16
Nodes (21): StudentHomePage(), StudentHome(), StudentHomeForGrade(), CalendarModal(), DetailRow(), AssignmentDetail(), ClassOrActivityDetail(), EventDetailModal() (+13 more)

### Community 49 - "K5Performance.jsx"
Cohesion: 0.14
Nodes (25): K5_CARD, BehindBanner(), Header(), Hero(), K5Performance(), PILLS, QUIET, TABS (+17 more)

### Community 50 - "k5PerformanceData.js"
Cohesion: 0.16
Nodes (25): addDays(), courseTone(), daysBetween(), daysTo(), fmtDay(), fmtWeekday(), GOAL_SCORES, isoTime() (+17 more)

### Community 51 - "calendarEvents.js"
Cohesion: 0.15
Nodes (26): getFetchRange(), loadStoredPrefs(), saveStoredPrefs(), useStudentCalendar(), addMinutesOrEndOfDay(), applyCalendarFilters(), buildCourseRegistry(), classifyEventKind() (+18 more)

### Community 52 - "useDashboardContext.js"
Cohesion: 0.14
Nodes (26): DashboardContext, DashboardProvider(), parseGradeCache(), readGradeCache(), readSearch(), readSearchOnServer(), studentDemoRowQuery(), subscribe() (+18 more)

### Community 53 - "loginPageUrl"
Cohesion: 0.14
Nodes (22): ChooseAccountPage(), describe(), metadata, schoolLogo(), AddEnrollmentWizardShell(), LogoMark(), StepCircle(), StepRow() (+14 more)

### Community 54 - "ProgressReportView.jsx"
Cohesion: 0.17
Nodes (24): BackIcon(), ACT_GRID, ACT_GRID_NO_MODULE, CourseReport(), gradeTone(), K5ProgressReportView(), Kv(), scoreColor() (+16 more)

### Community 55 - "FullScreenLoader"
Cohesion: 0.16
Nodes (19): AddEnrollmentStepLoading(), DashboardBody(), DashboardChrome(), isOnboardingPath(), LastPathRecorder(), OnboardingGate(), ParentChildScope(), SessionExpiryWatcher() (+11 more)

### Community 56 - "AccountForm.jsx"
Cohesion: 0.16
Nodes (21): AccountForm(), handleEmailBlur(), handleSubmit(), refreshCaptcha(), setField(), INITIAL_FIELDS, randomCaptcha(), AccountInput() (+13 more)

### Community 57 - "next"
Cohesion: 0.12
Nodes (15): COOKIE_DOMAINS, encodeCookieValue(), POST(), sharedCookieDomain(), PIXEL, ParentModulePage(), ChangePasswordModal(), PasswordInput() (+7 more)

### Community 58 - "backendOrigin.js"
Cohesion: 0.13
Nodes (17): Home(), BackendSwitcher(), apply(), handlePointerMove(), handleReset(), handleSelectChange(), reclamp(), clampToViewport() (+9 more)

### Community 59 - "K5PerformanceCourseView.jsx"
Cohesion: 0.17
Nodes (23): CourseRow(), salutation(), teacherName(), ACT_GRID, Bar(), GradeHistory(), hms(), K5PerformanceCourseView() (+15 more)

### Community 60 - "K5Profile.jsx"
Cohesion: 0.17
Nodes (22): K5PhotoDialog(), AcademicSection(), Avatar(), Chip(), Field(), K5Profile(), Mark(), Note() (+14 more)

### Community 61 - "student-enroll/FeePaymentPlans.jsx"
Cohesion: 0.19
Nodes (22): Discounts(), FeeBreakdown(), Lines(), Row(), AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows() (+14 more)

### Community 62 - "StudentHomeK5.jsx"
Cohesion: 0.18
Nodes (21): ColourClues(), CalendarPopup(), MiniCalendar(), TodayCard(), AddSiblingsCard(), clueText(), isJoinable(), joinDays() (+13 more)

### Community 63 - "withSmsAuth"
Cohesion: 0.13
Nodes (19): Browser sign-in with SMS tokens (several users per browser), Checks, Cookies (all HttpOnly, Secure, SameSite=Lax, Path=/), How a request finds its user, Known limits, Settings, Signing in and out, withSmsAuth() (+11 more)

### Community 64 - "useCartCheckout"
Cohesion: 0.19
Nodes (24): useParentFeePayment(), checkPaidStatus(), fail(), flushPoll(), launchGateway(), sessionOut(), startPoll(), stopPoll() (+16 more)

### Community 65 - "useAppearance"
Cohesion: 0.18
Nodes (20): useAppearance(), AppearanceSettingsPanel(), Choice(), DyslexiaSection(), HandChoice(), optionState(), Section(), Swatches() (+12 more)

### Community 66 - "error.jsx"
Cohesion: 0.26
Nodes (14): Error(), ErrorDetails(), ErrorPageFooter(), ErrorPageHeader(), GlobalError(), NotFound(), SchoolLogo(), useSchoolName() (+6 more)

### Community 67 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 68 - "callLocationForPaymentPromise"
Cohesion: 0.27
Nodes (18): confirmAndPay(), confirmAndPay(), start(), start(), start(), checkCartPayment(), getIpLocation(), getAirwallexPaymentMethods() (+10 more)

### Community 69 - "K5Toolbar.jsx"
Cohesion: 0.16
Nodes (18): K5ClockIcon(), greeting(), K5Toolbar(), titles(), VIEWS, zoneLabel(), DROPS, K5WeatherTile() (+10 more)

### Community 70 - "useStudentCart.js"
Cohesion: 0.22
Nodes (20): CART_KEYS, useAddPlanToCart(), useApplyCartDiscount(), useCartDetails(), useCartInvalidation(), useCreateCartPayment(), useRemoveCartItem(), addPlanToCart() (+12 more)

### Community 71 - "PaymentResponseView"
Cohesion: 0.14
Nodes (11): EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage(), PaymentResponseSuccessPage(), RegistrationPaymentResponseSuccessPage(), EvaluationPaymentResponseSuccessPage(), OtherPaymentResponseSuccessPage(), PaymentResponseFailurePage() (+3 more)

### Community 72 - "picoEvents.js"
Cohesion: 0.17
Nodes (18): INITIAL_LIVE, listeners, PICO_SAY_EVENT, subscribe(), usePicoLive(), coveredByDialog(), FIXED_PINS, isMobileView() (+10 more)

### Community 73 - "add-enrollment/FeePaymentPlans.jsx"
Cohesion: 0.24
Nodes (18): AnnualSummary(), baseRow(), BreakdownBlock(), buildExtraRows(), currencyOf(), CustomPlanTable(), describeMonths(), discountRow() (+10 more)

### Community 74 - "profileModel.js"
Cohesion: 0.25
Nodes (19): buildProfileModel(), CUSTOM_TYPES, customFieldsOf(), DIAL_BY_ISO, dialCode(), DOCS, filled(), fullName() (+11 more)

### Community 75 - "AddCreatePassword.jsx"
Cohesion: 0.19
Nodes (15): AddEnrollmentCreatePasswordPage(), metadata, AccountSetupSection(), CredRow(), OutlookCredentials(), Step(), AddCreatePassword(), initials() (+7 more)

### Community 76 - "LoginHistory.jsx"
Cohesion: 0.18
Nodes (14): LoginHistoryPage(), COLUMNS, K5LoginHistory(), PageButton(), SummaryTile(), svgProps, assetUrl(), HEADERS (+6 more)

### Community 77 - "learningProgramTheme.js"
Cohesion: 0.20
Nodes (14): EnrollRedirect(), decodePayload(), EnrollPage(), getFirstValue(), PageTitle(), findLearningProgram(), getLearningProgramLabel(), getLearningProgramRouteCode() (+6 more)

### Community 78 - "dashboardNav.js"
Cohesion: 0.18
Nodes (16): GroupItem(), iconFor(), ICONS, LinkItem(), Sidebar(), dashboardBasePath(), deriveSegment(), HOME_PAGE_LINKS (+8 more)

### Community 79 - "AiAdvisorDialog.jsx"
Cohesion: 0.14
Nodes (17): ACTION_BADGE, BANDS, Chip(), ConsentNote(), formatCredit(), ListProgress(), NO_RETRY_CODES, OptionCard() (+9 more)

### Community 80 - "courseAdvisorApi.js"
Cohesion: 0.30
Nodes (16): required(), useAdvisorChat(), useAdvisorStart(), useAdvisorSuggestions(), useApplySuggestions(), useConfirmMarksheet(), useDismissSuggestions(), applyAdvisorSuggestions() (+8 more)

### Community 81 - "ParentAttendance.jsx"
Cohesion: 0.22
Nodes (12): Page(), Chart, esc(), MonthlyChart(), MONTHS, SUMMARY, SummaryChart(), Delta() (+4 more)

### Community 82 - "K5NavRail.jsx"
Cohesion: 0.21
Nodes (14): CLUB_ART, flattenItems(), iconFor(), ICONS, K5NavRail(), NavGroup(), NavLink(), NavTile() (+6 more)

### Community 83 - "K5Attendance.jsx"
Cohesion: 0.18
Nodes (16): academicYearMonths(), badgeOf(), buildMonth(), GOLD, K5Attendance(), Medal(), MON, MON_LONG (+8 more)

### Community 84 - "AiAdvisorDialog"
Cohesion: 0.20
Nodes (12): AiAdvisorDialog(), goToQuestions(), handleApply(), handleAsk(), handleConfirmMarks(), handleFiles(), handleSuggest(), loadStart() (+4 more)

### Community 85 - "devDependencies"
Cohesion: 0.12
Nodes (14): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.3.5, @playwright/test@^1.64.1, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^26.6.2 (+6 more)

### Community 86 - "AcademicYearExtension.jsx"
Cohesion: 0.27
Nodes (13): AcademicYearExtensionPage(), AcademicYearExtension(), avail(), openCourse(), buildProceed(), CourseCard(), courseImage(), ExtensionDetail() (+5 more)

### Community 87 - "K5Shell.jsx"
Cohesion: 0.20
Nodes (11): AppearanceContext, AppearanceProvider(), parseSaved(), readStorage(), subscribeDark, subscribeReduced, subscribeStorage(), ReadingRuler() (+3 more)

### Community 88 - "K5PerformanceIcons.jsx"
Cohesion: 0.23
Nodes (13): CalendarIcon(), ChartIcon(), CheckBoxIcon(), EyeIcon(), LOCKED, MEDAL_GLYPH, STROKE, UpRightIcon() (+5 more)

### Community 89 - "FeeDetails.jsx"
Cohesion: 0.22
Nodes (12): FeeDetailsPage(), COLUMNS, feeAction(), K5FeeDetails(), PageButton(), paymentName(), RETRY_STATUSES, feeAction() (+4 more)

### Community 90 - "verifyAccountAuth.mjs"
Cohesion: 0.16
Nodes (13): at, b64(), check(), held, jar, other, { privateKey, publicKey }, rejects() (+5 more)

### Community 91 - "AppDownloadDialog.jsx"
Cohesion: 0.21
Nodes (10): AppDownloadDialog(), DancingPhone(), FEATURES, SchoolPin(), STEPS, StepsDemo(), StoreCard(), STORES (+2 more)

### Community 92 - "K5PerformanceCompare.jsx"
Cohesion: 0.25
Nodes (13): BANDS, CompareCard(), fmtGap(), gapBar(), GLANCE_GRID, K5PerformanceCompare(), LockIcon(), overallOf() (+5 more)

### Community 93 - "PaymentInProgressModal.jsx"
Cohesion: 0.30
Nodes (12): continueHref(), devicePhrase(), expiryLine(), formatDay(), formatTime(), Option(), parseInstant(), PaymentInProgressModal() (+4 more)

### Community 94 - "5. Progress"
Cohesion: 0.14
Nodes (13): 1. How the file is built, 2. How dummy mode turns on (legacy), 3. Every public export → legacy caller → Next.js target, 4. Implementation plan (Next.js), 5. Progress, Dummy (demo) student mode — legacy analysis and Next.js plan, Modules already migrated to Next (need dummy support), Not needed for the student dashboard (+5 more)

### Community 95 - "FloatingLabelSelect"
Cohesion: 0.24
Nodes (9): AccountFormOfflineB2B(), handleSubmit(), INITIAL_FIELDS, LEARNING_PROGRAMS, FloatingLabelInput(), FloatingLabelSelect(), Input(), useAccountSignup() (+1 more)

### Community 96 - "AddParentDetails"
Cohesion: 0.24
Nodes (9): AddParentDetailsStep(), AddEnrollmentParentDetailsPage(), AddParentDetails(), clearErrors(), handleSubmit(), toggleSameAsStudent(), defaultFields(), mapSignupParentToFields() (+1 more)

### Community 97 - "Attendance.jsx"
Cohesion: 0.30
Nodes (10): AttendancePage(), Attendance(), Chart, Delta(), MonthlyChart(), MONTHS, StatCard(), SUMMARY (+2 more)

### Community 98 - "Transcript.jsx"
Cohesion: 0.29
Nodes (8): TranscriptPage(), ActionMenu(), COLUMNS, initialsOf(), K5Transcript(), ActionDropdown(), Transcript(), useStudentTranscriptStatus()

### Community 99 - "AccountCreationForm.jsx"
Cohesion: 0.27
Nodes (8): AccountCreationForm(), FALLBACK_POLICY_LINKS, FALLBACK_SCHOOL_INFO, AccountCreationPage(), searchParamsToQueryString(), SignupFooter(), isEnrollmentViaNextjs(), legacyEnrollmentSignupUrl()

### Community 100 - "sheet.jsx"
Cohesion: 0.20
Nodes (8): Sheet(), SheetContent(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SIDE_CLASSES

### Community 101 - "parentDashboardApi.js"
Cohesion: 0.33
Nodes (10): parentGateQuery(), useParentGate(), getUserShortProfile(), authHeaders(), getParentChildFeeDetails(), getParentChildOverview(), getParentChildSchedule(), getParentGate() (+2 more)

### Community 102 - "useReEnrollmentGateway.jsx"
Cohesion: 0.32
Nodes (9): useReEnrollmentGateway(), checkPaidStatus(), flushPaidStatusPoll(), startPaidStatusPoll(), stopPaidStatusPoll(), useAirwallexPaymentMethods(), useInvokePaymentGateway(), usePaymentGatewayOptions() (+1 more)

### Community 103 - "Image Optimization and Next.js Image Component Rules"
Cohesion: 0.18
Nodes (10): 1. Prefer Next.js Image Component, 2. Image Dimensions and Layout, 3. External and Dynamic Images, 4. Loading and Performance, 5. Special Cases, 6. Mandatory Development Workflow, 7. Preserve Existing Functionality, 8. Project-Wide Enforcement (+2 more)

### Community 104 - "useIntlTelInput"
Cohesion: 0.27
Nodes (6): PhoneNumberField(), decorateFullscreenPopup(), useIntlTelInput(), handleOpenSelector(), intl-tel-input, getDefaultCountryCode()

### Community 105 - "K5Header.jsx"
Cohesion: 0.31
Nodes (9): HeaderAvatar(), K5Header(), MenuItem(), MoreItem(), K5ChangePasswordModal(), K5PasswordInput(), RULES, picoSay() (+1 more)

### Community 106 - "AI Course Advisor — Implementation Plan"
Cohesion: 0.18
Nodes (10): 10. Data audit results (staging, 2026-10-09), 1. Ground rules, 2. Settings (`Settings`, type `CONFIGURATION`), 3. When the AI Suggester shows, 4. Student flow, 5. Server API (`is-rest-api`), 7. Frontend (`is-sms`), render only, 9. Decisions (+2 more)

### Community 107 - "profileOtpApi.js"
Cohesion: 0.33
Nodes (8): useProfileOtp(), EMAIL_FIELDS, fail(), otpRequest(), PHONE_FIELDS, sendProfileOtp(), verifyProfileOtp(), WHATSAPP_FIELD

### Community 108 - "k5Fonts.js"
Cohesion: 0.22
Nodes (8): andika, atkinson, dmSans, fredoka, k5FontVariables, lexend, nunito, outfit

### Community 109 - "8. Phases"
Cohesion: 0.22
Nodes (9): 8. Phases, Phase 0: Groundwork, Phase 1: Context builder and validator (server, read-only), Phase 2: Marksheet, Phase 3: Recommend and apply (server), Phase 4: Frontend and AI transitions, Phase 5: Chat (`COURSE_ADVISOR_CHAT_ENABLED`), Phase 6: Rollout (+1 more)

### Community 110 - "useStudentProfile.js"
Cohesion: 0.44
Nodes (7): studentDashboardDetailsQuery(), useStudentProfile(), getMyProfile(), idOf(), loadPlaceNames(), loadWithdrawalEligibility(), unique()

### Community 111 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, start, verify:account-auth, verify:cookie-domain, verify:payload-encoding (+1 more)

### Community 112 - "[school]/page.jsx"
Cohesion: 0.39
Nodes (5): SchoolBasePage(), SCHOOL_URLS, DASHBOARD_ROLES, LAST_DASHBOARD_PATH_COOKIE, safeDashboardPath()

### Community 113 - "useSpeech.js"
Cohesion: 0.43
Nodes (6): SelectToSpeak(), GB_NAMES, hasSpeech(), noSubscribe(), pickGbVoice(), useSpeech()

### Community 114 - "navigateTop"
Cohesion: 0.39
Nodes (7): embeddedPaymentUrl(), handleFailure(), launchGateway(), isFramed(), navigateTop(), parentOrigin(), useFramed()

### Community 115 - "paymentResponseApi.js"
Cohesion: 0.54
Nodes (7): backendUrl(), buildQuery(), getJson(), getPaymentResponseFailure(), getPaymentResponseSuccess(), getPaymentSettlementStatus(), SUCCESS_ENDPOINTS

### Community 116 - "AI Course Advisor — Rollout Runbook (Phase 6)"
Cohesion: 0.29
Nodes (6): 1. Deploy (once), 2. Live AI check (before switching anything on), 3. Who sees it, 4. Smoke test per stage (about 10 minutes), 5. Metrics (read-only SQL), AI Course Advisor — Rollout Runbook (Phase 6)

### Community 117 - "ExamDetails.jsx"
Cohesion: 0.60
Nodes (3): ExamDetailsPage(), ExamDetails(), useStudentExaminationDetails()

### Community 118 - "K5CompleteProfileModal.jsx"
Cohesion: 0.67
Nodes (5): fieldLabel(), isMissing(), K5CompleteProfileModal(), SectionBlock(), loadProfileCompletingProcess()

### Community 119 - "prepareMarksheetFiles"
Cohesion: 0.53
Nodes (5): downscale(), IMAGE_TYPES, isImage(), isPdf(), prepareMarksheetFiles()

## Knowledge Gaps
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `OptimizedImage`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `VideoLibrary.jsx`, `layout.js`, `react-hot-toast`, `Stage3CourseSelection.jsx`, `k5Calendar.js`, `useAddEnrollmentContext.js`, `ClubPage`, `add-enrollment/ReviewInlineEdit.jsx`, `CalendarCard.jsx`, `K5AttendanceDetails.jsx`, `profileEdit.js`, `parentHome.js`, `DialogContent`, `Cart.jsx`, `useSelectedChild`, `PaymentResponseView.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `ParentProgressReports.jsx`, `K5ProfileCustomFields.jsx`, `AddStage3ReviewPayment.jsx`, `lucide-react`, `resolveBackendOrigin`, `backendRequest`, `MyCertificates.jsx`, `Stage4ReviewPayment.jsx`, `package.json`, `useDashboardContext`, `DatePicker`, `student-enroll/ReviewInlineEdit.jsx`, `Stage2ParentDetails.jsx`, `PaymentGatewayInitView.jsx`, `expireSession`, `k5Bits.jsx`, `ParentAcademicPerformance.jsx`, `AddParentDetails.jsx`, `K5Games.jsx`, `date-fns`, `K5Performance.jsx`, `k5PerformanceData.js`, `calendarEvents.js`, `useDashboardContext.js`, `loginPageUrl`, `ProgressReportView.jsx`, `FullScreenLoader`, `AccountForm.jsx`, `next`, `backendOrigin.js`, `K5PerformanceCourseView.jsx`, `K5Profile.jsx`, `student-enroll/FeePaymentPlans.jsx`, `StudentHomeK5.jsx`, `error.jsx`, `callLocationForPaymentPromise`, `K5Toolbar.jsx`, `picoEvents.js`, `add-enrollment/FeePaymentPlans.jsx`, `AddCreatePassword.jsx`, `LoginHistory.jsx`, `learningProgramTheme.js`, `dashboardNav.js`, `AiAdvisorDialog.jsx`, `K5NavRail.jsx`, `K5Attendance.jsx`, `AcademicYearExtension.jsx`, `K5Shell.jsx`, `K5PerformanceIcons.jsx`, `FeeDetails.jsx`, `K5PerformanceCompare.jsx`, `PaymentInProgressModal.jsx`, `FloatingLabelSelect`, `AddParentDetails`, `Transcript.jsx`, `AccountCreationForm.jsx`, `sheet.jsx`, `useReEnrollmentGateway.jsx`, `useIntlTelInput`, `K5Header.jsx`, `profileOtpApi.js`, `useStudentProfile.js`, `useSpeech.js`, `navigateTop`, `K5CompleteProfileModal.jsx`?**
  _High betweenness centrality (0.321) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useDummyStudent()` (e.g. with `Phase 0 — foundation (blocks everything else)` and `readSearch()`) actually correct?**
  _`useDummyStudent()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `OptimizedImage` be split into smaller, more focused modules?**
  _Cohesion score 0.054455445544554455 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `OptimizedImage`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `VideoLibrary.jsx`, `layout.js`, `react-hot-toast`, `Stage3CourseSelection.jsx`, `k5Calendar.js`, `ClubPage`, `add-enrollment/ReviewInlineEdit.jsx`, `CalendarCard.jsx`, `K5AttendanceDetails.jsx`, `parentHome.js`, `DialogContent`, `Cart.jsx`, `useSelectedChild`, `PaymentResponseView.jsx`, `useDummyStudent`, `K5ProfileEditors.jsx`, `ParentProgressReports.jsx`, `K5ProfileCustomFields.jsx`, `AddStage3ReviewPayment.jsx`, `resolveBackendOrigin`, `MyCertificates.jsx`, `Stage4ReviewPayment.jsx`, `package.json`, `useDashboardContext`, `DatePicker`, `student-enroll/ReviewInlineEdit.jsx`, `Stage2ParentDetails.jsx`, `PaymentGatewayInitView.jsx`, `expireSession`, `k5Bits.jsx`, `ParentAcademicPerformance.jsx`, `AddParentDetails.jsx`, `K5Games.jsx`, `date-fns`, `k5PerformanceData.js`, `loginPageUrl`, `ProgressReportView.jsx`, `FullScreenLoader`, `AccountForm.jsx`, `next`, `backendOrigin.js`, `K5Profile.jsx`, `student-enroll/FeePaymentPlans.jsx`, `useAppearance`, `K5Toolbar.jsx`, `picoEvents.js`, `add-enrollment/FeePaymentPlans.jsx`, `AddCreatePassword.jsx`, `LoginHistory.jsx`, `dashboardNav.js`, `AiAdvisorDialog.jsx`, `ParentAttendance.jsx`, `K5NavRail.jsx`, `AcademicYearExtension.jsx`, `FeeDetails.jsx`, `AppDownloadDialog.jsx`, `PaymentInProgressModal.jsx`, `FloatingLabelSelect`, `Attendance.jsx`, `Transcript.jsx`, `sheet.jsx`, `K5Header.jsx`, `useSpeech.js`, `ExamDetails.jsx`, `K5CompleteProfileModal.jsx`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `OnboardingSetup.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05627147766323024 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `OptimizedImage`, `OnboardingSetup.jsx`, `K5BookView.jsx`, `layout.js`, `session.js`, `react-hot-toast`, `Stage3CourseSelection.jsx`, `useAddEnrollmentContext.js`, `add-enrollment/ReviewInlineEdit.jsx`, `profileEdit.js`, `parentHome.js`, `DialogContent`, `Cart.jsx`, `useSelectedChild`, `react`, `PaymentResponseView.jsx`, `getAccountSession`, `hasBackendOrigin`, `AddStage3ReviewPayment.jsx`, `lucide-react`, `backendRequest`, `package.json`, `Stage2ParentDetails.jsx`, `PaymentGatewayInitView.jsx`, `studentSignupBackendApi.js`, `expireSession`, `date-fns`, `K5Performance.jsx`, `useDashboardContext.js`, `loginPageUrl`, `FullScreenLoader`, `AccountForm.jsx`, `backendOrigin.js`, `withSmsAuth`, `error.jsx`, `picoEvents.js`, `AddCreatePassword.jsx`, `learningProgramTheme.js`, `dashboardNav.js`, `ParentAttendance.jsx`, `K5NavRail.jsx`, `K5Shell.jsx`, `AddParentDetails`, `Attendance.jsx`, `AccountCreationForm.jsx`, `K5Header.jsx`, `k5Fonts.js`, `[school]/page.jsx`, `K5CompleteProfileModal.jsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `K5BookView.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052604698672114404 - nodes in this community are weakly interconnected._