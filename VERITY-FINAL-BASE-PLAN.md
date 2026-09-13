# Verity — Final Base Plan

**Consolidated product draft · 13 September 2026**

This is the proposed product baseline after reconsidering the original concept, Challenge 4, and both rounds of feedback. It defines the experience and scope; backend, AI models, storage, APIs, and deployment remain undecided. It does not claim that the existing prototype implements this revised plan.

## 1. The product in one sentence

**Verity helps students discover opportunities through their interests and relevant experience, understand the requirements and practical barriers, and prepare a realistic next step toward participation.**

Student-facing promise: **“Find something worth trying. See what it takes. Get help taking the next step.”**

Opportunities are the centre. Evidence, application help, tutoring, and optional classroom integration support that journey.

## 2. The problem and intended users

Challenge 4, **Equity & Access Across All Pathways**, identifies unequal access to internships, industry exposure, career guidance, and enrichment. It highlights structural exclusion affecting students from vocational schools, private institutions, and less privileged backgrounds, and asks for recognition of capability and character with support beyond the classroom.

Verity focuses on students who want to explore a field but may have limited guidance, formal exposure, money, time, or recognised credentials. A student does not need strong grades, a prestigious activity record, a polished portfolio, or a Google Classroom account to start.

For the first demonstration, use one clearly labelled fictional student from a private institution exploring a beginner engineering experience. This is a concrete demonstration persona, not a decision to limit the product to that pathway or field. Exact launch age range and participating institutions remain team decisions.

The product addresses four connected problems:

| Student problem | Verity’s response |
|---|---|
| “I don’t know what is available to someone like me.” | Discover experiences with visible institution and experience requirements. |
| “I have done useful things, but nothing that looks impressive on an application.” | Help describe projects, hobbies, responsibilities, and contributions accurately. |
| “This looks interesting, but can I actually attend?” | Show costs, timing, format, requirements, and unresolved access questions. |
| “I found something, but I don’t know what to do next.” | Help prepare an application, learn a prerequisite, ask a specific question, or find an alternative. |

Verity can make barriers visible and help students navigate them. It cannot promise admission, funding, an organiser’s response, or the removal of institutional restrictions.

## 3. Direction chosen and why

Ranked for this challenge and a tightly scoped student-facing demonstration:

1. **Opportunity discovery with evidence and practical support — chosen direction.** It connects the challenge directly to a complete student journey and can be demonstrated without waiting for an external organisation.
2. **An organiser-facing inclusion platform — possible future extension.** This could address restrictive selection practices more directly, but requires provider participation and a different primary user experience.
3. **The original tutor-first platform — retained selectively.** It offers learning support, but an academic improvement loop does not by itself address unequal access to experiences.

Two corrections guide this draft:

- **A real adviser or organiser response is not an MVP dependency.** An honest contact-draft and handoff flow demonstrates the mechanism. Real access outcomes will eventually require dependable providers and support routes.
- **Evidence must not become another entrance exam.** Students can explore before creating a portfolio. Lack of records means information is missing; it does not establish low capability or low exposure.

The earlier phrase “high potential, low exposure” describes a motivation, not a student label or ranking. Describe specific interests and evidence. If exposure matters, ask the student about relevant experiences rather than inferring it from an empty profile. Household and school projects may show useful experience while the student still lacks industry contacts.

## 4. The core student journey

**Explore an interest → inspect a relevant opportunity → check requirements and barriers → optionally select supporting evidence → prepare the next step → keep track of what happened.**

Students can move between these steps. Evidence may improve an application or an explanation of relevance, but is not required before discovery.

Example journey:

1. A student chooses engineering, weekends, and a programme budget under $20. They have no previous internship or competition experience.
2. Discover surfaces a beginner workshop whose example listing states that private-institution students can attend.
3. The detail screen shows a free programme and a weekend session, but flags transport costs and a required application statement.
4. The student adds a school build and a household repair to My Evidence, explaining their own contribution.
5. Support helps draft a statement using those facts. It also prepares a transport-cost enquiry if needed.
6. The student reviews the drafts and chooses whether to use the organiser’s contact or application route.
7. The opportunity remains saved with the next action visible. Drafting an enquiry does not mark the transport barrier resolved.

## 5. First launch

The first screen asks **“What would you like to explore?”** with example interests and an **“I’m not sure yet”** option. Students can browse examples immediately and refine their preferences later.

Use a short, skippable setup. Do not require every field before showing results.

| Information | When to ask | Purpose and boundary |
|---|---|---|
| Interests or something they want to try | First screen; optional | A starting point for discovery, not a permanent career label. |
| Available days or preferred timing | Quick optional preference | Distinguish opportunities that fit current availability. |
| Programme budget | Quick optional preference | Show stated fees separately from travel, equipment, and other costs. An unanswered budget is unknown, not zero. |
| Online/in-person preference and broad travel area | Optional | Help with format and travel practicality. Exact home address is unnecessary for discovery. |
| Education pathway or institution type | When relevant to eligibility | Use only to explain a published requirement, never as a prestige score. If omitted, leave that check unresolved. |
| Age eligibility | When a listing requires it | Ask for the minimum relevant information; do not require a date of birth merely to browse. |
| Existing experiences or evidence | After an opportunity interests them, or in My Evidence | Entirely optional for discovery. Invite everyday examples. |
| Support they want | When a barrier appears, or through an optional preference | Ask what arrangement would help, without requiring a personal explanation. |

Do not ask for grades, household income, disability diagnoses, family circumstances, or proof of disadvantage as a general entry requirement. A support preference must not reduce a student’s suitability ranking or be shared automatically.

Connecting Google Classroom is an optional later action, after the student understands why they might use it.

## 6. Four core screens

Four meaningful screens do not require four permanent tabs. Use **Discover**, **My Evidence**, and **Support** as navigation destinations. **Opportunity Detail** opens from Discover and returns to the same results and filters. Profile, preferences, and optional connections live in a compact menu.

### A. Home / Discover

**Question answered: “What could I explore next?”**

The top of the screen shows an interest prompt or the student’s current interests, editable practical preferences, and a clear way to browse. Include an “I’m not sure yet” route that offers different beginner experiences without assigning a career.

Each opportunity card shows:

- Experience name, provider, and type: workshop, industry exposure, guidance, enrichment, or internship.
- Format, date or timing, stated programme fee, and location where relevant.
- Important eligibility information and anything that still needs checking.
- A short, specific explanation of relevance.
- **View details** and **Save** actions.

Use descriptions such as “Related to your interest in making things” or “Your repair project may be useful to mention.” Avoid unexplained match percentages, “perfect fit,” or career predictions.

Saved opportunities sit within Discover. Show the next action or a compact stage such as Saved, Preparing, or Awaiting information. Application and attendance updates must state when they are student-reported.

When no results meet the selected conditions, explain which conditions are limiting the list. Offer relevant online, lower-cost, beginner, or different-time alternatives where available. Let the student choose whether to broaden a preference; do not silently relax it.

### B. Opportunity Detail

**Question answered: “What does this involve, and what must I check?”**

Present the experience first, followed by requirements and practical access information:

| Detail | Required product behaviour |
|---|---|
| Provider and source | Identify the organiser and link to the source where available. |
| Dates and application deadline | Show current published information; label missing or uncertain dates. |
| Institution, age, or experience requirements | Quote or faithfully summarise the relevant conditions. Explain what is met, conflicting, or unknown. |
| Programme fee and other costs | Separate stated fees from materials, equipment, travel, and unknown expenses. |
| Timing, duration, location, and format | Let the student compare these with their preferences. |
| Application requirements | Show what must be prepared, such as a statement, project example, or prerequisite. |
| Support arrangements | Distinguish organiser-confirmed arrangements from support the student still needs to request. |
| Relevance | Explain the connection to chosen interests and, if selected, specific evidence. |
| Information freshness | Show when details were last checked. Stale or conflicting information requires rechecking. |

Separate three judgements: **relevance**, **published eligibility**, and **practical fit**. Meeting one does not establish the others or guarantee a place.

Primary action: **Prepare my next step**. Secondary actions: **Save**, **Ask a question**, **View source**, and **Find an alternative**. Use the official application route when one exists; the MVP does not need to submit applications itself.

### C. My Evidence

**Question answered: “What have I already done that I can explain honestly?”**

This is a collection of experiences and supporting material, not a score dashboard. Accept school projects, hobbies, paid work, CCA, community activity, everyday responsibilities, and other relevant experiences the student chooses to describe. Grades can be included voluntarily or when a specific published requirement makes them relevant.

A simple entry contains:

1. What the experience was and its context.
2. What the student personally did.
3. The result or what they learned; an unsuccessful attempt can still be meaningful.
4. An optional supporting reference, file, or person who observed it.
5. Suggested capability descriptions the student can accept, edit, or reject.

Use prompts such as “What did you change after your first attempt?” rather than demanding polished achievements. A first application can express interest and willingness to learn without previous formal experience.

Evidence status must be clear: self-described, linked to source material, or confirmed by a named reviewer if that mechanism exists later. Uploading a file does not automatically verify the claim. A group project does not establish that the student performed every part.

Do not generate character, intelligence, employability, or overall potential scores. Specific actions may illustrate teamwork, care, persistence, or reliability; broad conclusions require context. Students decide which entries support a particular application and what leaves their private collection.

### D. Support

**Question answered: “What would help me take the next step?”**

Support opens with the selected opportunity and the unresolved task visible. If opened without an opportunity, offer a small choice of preparation tasks rather than an empty general chat.

Four modes belong within this screen:

| Mode | What it does |
|---|---|
| Application help | Organises selected evidence into a statement or checklist. Asks about missing facts and preserves the student’s contribution accurately. |
| Learn what is needed | Explains a term, prerequisite, or short concept relevant to the opportunity. A simple diagram may appear inside the explanation. |
| Practise explaining | Helps the student describe a project or rehearse an interview response with feedback on clarity and supporting examples. |
| Resolve a practical question | Shows a relevant alternative or prepares a specific enquiry to an organiser or trusted support contact. |

The student reviews generated material. Verity must not invent experiences, grades, achievements, qualifications, funding, contacts, or provider commitments. Application drafts should be checked against the opportunity’s stated rules on assistance where those rules are available.

A prepared enquiry is a draft, not a sent message. Sending a message is not receiving help. A support request remains unresolved until there is an actual response or the student records a change. Use a real published contact when available; otherwise say no contact was found and offer another next step.

## 7. Discovery and fairness rules

These are product behaviours; the technical matching method remains open.

1. **Start with the experience, not a ranking of students.** Consider stated interests, published requirements, and student-controlled practical preferences.
2. **Use evidence to explain relevance or support preparation.** More entries, better writing, or a prestigious school must not automatically make a student more deserving of opportunity.
3. **Keep unknown separate from unmet.** Missing grades, institution details, or records do not establish ineligibility. Likewise, missing organiser restrictions do not establish eligibility.
4. **Make the comparison visible.** Explain which details fit, conflict, or need checking. Give the student a way to correct their information or dismiss an irrelevant suggestion.
5. **Do not hide all uncertain options.** Relevant opportunities with unclear details can appear in a clearly labelled group. Confirmed conflicts can be inspected, with alternatives, without presenting them as immediately accessible.
6. **Do not call a programme affordable from its fee alone.** “No programme fee” is acceptable when supported. “Within your total budget” needs enough cost information and clearly labelled estimates.
7. **Do not infer a career from a subject score.** A grade can answer a published prerequisite question; it cannot establish a career destiny or a character trait.
8. **Do not make students prove disadvantage.** First-time and beginner opportunities can be easy to find without classifying students as low potential, deprived, or deserving.

The proposed presentation order is: relevant options with fewer known access conflicts, relevant options needing confirmation, and useful alternatives. Availability and practical fit can change; an ordered list is not an admissions decision.

## 8. What happens to the original features

| Original feature | Revised role |
|---|---|
| Opportunity and career finder | Becomes Discover and Opportunity Detail. Prioritise experiences and exploration over career rankings. |
| Records / portfolio | Becomes My Evidence, with student-controlled selection and honest status labels. |
| Live tutor | Becomes contextual help inside Support. |
| Whiteboard | Optional diagram within a relevant Support explanation; no independent whiteboard product in the MVP. |
| Generated quizzes | Optional short practice later when it helps preparation; no generic quiz system in the MVP. |
| Grades, radar chart, and blended scores | Remove from the core journey. Keep specific academic results only where the student chooses them or a real requirement needs them. Retire both 50/50 and 70/30 overall formulas. |
| Google Classroom | Optional source of selected school work or context. Importing an artefact is not automatic proof of capability. |
| Connections page | Fold into a compact preferences menu when needed. |
| Concept map | Internal planning material, not a student destination. |

The existing extension is a possible delivery surface and contains reusable UI and mascot assets. Discovery must not conceptually depend on a student being on Google Classroom. The technical route for opening Verity independently can be decided during implementation.

## 9. First MVP boundary

Use the two-hour build framing in the supplied feedback as a reason to protect scope, not as a guarantee of what can be completed. The smallest coherent demonstration covers one student, one interest area, a few labelled example listings, and one complete preparation journey.

**Core demonstration:**

- Discover with editable interests and a few practical filters.
- Opportunity Detail showing a useful option, a known conflict, and an unresolved requirement across the example listings.
- My Evidence with at least one editable everyday experience.
- Support that prepares one application statement from selected facts and one organiser enquiry about a barrier.
- A saved next step, plus a way to return to the opportunity.

**Can be simulated, with visible labels:** listings, a student profile, example responses, imported school work, and external contact handoffs. If output is scripted, describe it as a scripted demonstration; do not present it as working live AI.

**Not required for this MVP:** real organiser replies, adviser staffing, partner onboarding, automatic application submission, live Classroom import, broad opportunity aggregation, verified credentials, cross-subject tutoring, generic quizzes, a radar dashboard, or a standalone whiteboard.

If time is tight, shorten Support to application preparation and one enquiry draft. Expand tutoring and interview practice after the main journey is coherent. Functional completeness of that journey is the priority over the number of tabs.

## 10. Suggested demonstration story

Use clearly fictional student and opportunity data throughout:

**Student:** private-institution learner interested in engineering; weekends available; programme budget under $20; no internship or competition history; experience from a school build and repairing equipment at home.

**Opportunity:** beginner engineering workshop; example listing states private-institution eligibility, weekend attendance, no programme fee, no prior competition requirement, and a short application statement. Travel cost is initially unknown.

Show the following:

1. The student discovers the workshop without entering grades or creating a full portfolio.
2. The details explain why it is relevant and identify the unresolved travel cost. The interface does not claim complete accessibility.
3. The student selects an everyday repair example and describes what they actually did.
4. Support drafts an honest statement. It does not add a competition, qualification, or invented result.
5. Support prepares an enquiry about location or transport assistance using a supplied example contact. Show that no message has been sent.
6. The saved opportunity records “statement prepared; travel details awaiting confirmation.” An online example remains available as an alternative.

This demonstrates movement from discovery to preparation. Claim confirmed participation only when a real student actually participates; the demonstration does not prove an equity outcome.

## 11. Visual and interaction direction

Keep Verity’s gold, white, and charcoal identity: friendly, calm, and readable. Use the mascot to welcome, explain, and encourage. Use labelled image placeholders for missing poses rather than inventing new assets.

Discover gets the strongest visual emphasis. Details should make access information easy to compare. My Evidence should feel like a manageable collection, and Support should feel tied to a concrete task.

Avoid leaderboards, deficit labels, unexplained scores, and congratulating someone as if an opportunity has already been secured. Use restrained status colours with words, not colour alone. Support keyboard use, visible focus, readable text, narrow screens, and reduced motion. A student should not need animation, audio, a connection import, or a long profile to make progress.

## 12. What would count as success

For the prototype, success means a reviewer can complete the journey and understand:

- Why an opportunity is relevant.
- Which requirements are met, conflicting, or unknown.
- What the student’s evidence actually supports.
- What help has been prepared and what remains unresolved.
- That the system has neither excluded a beginner for missing evidence nor invented an achievement.

For a later real pilot, examine progression from discovery to application and participation, where students abandon the process, whether information proves accurate, and whether identified barriers receive useful responses. If evaluating differences across pathways, use appropriate consent and enough evidence to interpret them. Small pilot results test feasibility; they do not establish that structural inequality has been solved.

The biggest unanswered product assumption is which barriers matter most for the intended cohort: discovery, eligibility, costs, schedules, application confidence, or limited places. Student and provider feedback should test this before broad expansion. An app cannot create additional places merely by improving recommendations.

## 13. Positioning and boundaries

The pitch is **opportunity access and preparation across pathways**, supported by evidence from the student’s actual life and work.

Existing services already support career and pathway exploration. For example, SkillsFuture’s ECG description includes exploring interests and making education and career decisions. Verity should therefore demonstrate the connected requirements-checking and preparation journey instead of claiming career discovery is new. [SkillsFuture: Education and Career Guidance](https://www.skillsfuture.gov.sg/ecg)

Optional Classroom context is a convenience to investigate, not a verified exclusive advantage. Manual entry must remain a valid route. The student’s control over their evidence and disclosures is part of the product, regardless of the backend chosen.

**Final pitch:**

> Verity helps students across education pathways find relevant opportunities, understand the requirements and practical barriers, and prepare their next step using evidence from what they have actually done. It makes room for students whose interests and capabilities are not captured by grades or prestigious experiences alone.

## 14. Decisions deliberately left for later

Backend architecture, models and prompts, matching implementation, data storage, accounts, integration permissions, import mechanics, hosting, deployment, and external service choices are outside this draft. Real providers, support partners, launch cohort, and listing-maintenance arrangements still need validation before a live rollout.

These open choices do not change the proposed product baseline: **Discover → understand access → bring relevant evidence when useful → prepare the next step.**

### Source and status note

This draft consolidates the supplied DOCX and workshop photos, the exact Challenge 4 statement supplied in chat, the existing Verity concept, the earlier critique, and the Sol feedback pasted by the user. Quoted assistant recommendations are inputs for reconsideration, not evidence that every proposal was already approved.

The earlier eight-screen prototype and its product/design notes describe the previous exploration. This document is the proposed baseline for the next design/build; it does not silently change the existing extension or declare backend decisions settled.
