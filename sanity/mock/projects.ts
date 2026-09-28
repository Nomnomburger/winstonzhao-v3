// Mock projects for testing the portfolio. Used in two places:
// - studio/scripts/seed-mock-projects.ts uploads them to the Sanity dataset
// - src/lib/projects.ts falls back to them in development when the dataset
//   has no projects (or can't be reached)
//
// Content is written in a compact shorthand and expanded into Sanity's
// document shape by `buildMockProjects`. Images are placeholder photos from
// picsum.photos; the seed script uploads them as real Sanity image assets.

type MockImage = {seed: string; w?: number; h?: number; alt?: string}

type MockBlock =
  | string // paragraph
  | {h3: string}
  | {bullets: string[]}
  | {image: MockImage; caption?: string; size?: 'content' | 'full'}
  | {video: string; caption?: string; size?: 'content' | 'full'; autoplay?: boolean}
  | {gallery: MockImage[]; caption?: string}

type MockSection = {title: string; heading?: string; content: MockBlock[]}

type MockProject = {
  id: string
  title: string
  slug: string
  year: number
  featured: boolean
  order?: number
  thumbnail: MockImage
  description: string
  client?: string
  discipline?: string
  link?: {url: string; label?: string}
  intro?: string
  hero?: {image: MockImage} | {video: string}
  summary?: string
  details?: {label: string; value: string}[]
  overview?: string
  impact?: string
  showSideMenu?: boolean
  sections?: MockSection[]
}

// A short CC0 clip (MDN's sample video) for testing video blocks.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

const MOCK_PROJECTS: MockProject[] = [
  {
    id: 'mock-project-heatmap',
    title: 'Heatmap.com Redesign',
    slug: 'heatmap-redesign',
    year: 2024,
    featured: true,
    order: 1,
    thumbnail: {seed: 'wz-heatmap', w: 1600, h: 1136, alt: 'Laptop showing the Heatmap dashboard'},
    description: 'Unifying a fragmented analytics platform into one cohesive interface.',
    client: 'Full Sprint — Heatmap.com',
    discipline: 'UI/UX',
    link: {url: 'https://heatmap.com', label: 'Visit'},
    intro:
      'During my Full Sprint internship in July 2024, I redesigned Heatmap’s interface to improve navigation and scalability. As new features expanded the platform, the UI became fragmented. This case study details the process of creating a more cohesive and user-friendly design.',
    hero: {
      image: {
        seed: 'wz-heatmap-hero',
        w: 2000,
        h: 1250,
        alt: 'Redesigned Heatmap dashboard shown on a laptop',
      },
    },
    summary:
      'Redefining the analytics experience at Heatmap by unifying fragmented workflows into a cohesive, scalable, and user-friendly interface.',
    details: [
      {label: 'Role', value: 'Product Design Intern'},
      {label: 'Timeline', value: 'Summer 2024 — 2 months'},
      {
        label: 'Skills & Tools',
        value: 'User Research\nCompetitive Analysis\nWire framing\nPrototyping\nFigma',
      },
    ],
    overview:
      'As a Product Design Intern at Full Sprint, I was tasked with reimagining the interface for Heatmap, an analytics platform that helps small businesses understand user behaviour through heatmaps, screen recordings, and AI insights. With new features added over time, the platform’s interface became fragmented and difficult to navigate. This case study outlines the redesign process to create a unified, scalable experience aligned with Heatmap’s evolving design language.',
    impact:
      'The redesign gave Heatmap a navigation and component foundation that absorbs new features instead of fragmenting around them. New users get one consistent layout to learn, and the team gets a simpler way to extend the product.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'How might we turn Heatmap’s cluttered, inconsistent interface into a cohesive platform that’s easy to navigate and ready to scale?',
        content: [
          'Imagine walking into a house where new furniture had been added whenever needed, without consideration for the overall layout or style. A modern sectional sofa sits next to a vintage rocking chair, while a minimalist coffee table clashes with an ornate cabinet. That’s what Heatmap’s interface had become – a collection of mismatched features that, while individually functional, created a confusing and disjointed experience. The result:',
          {
            bullets: [
              'Inconsistent navigation: The UI lacked a clear hierarchy or logical grouping of features.',
              'Fragmented design: The old interface felt incoherent as new modules were added arbitrarily.',
              'Increased cognitive load: Users struggled to find and learn new features in the disorganized layout.',
              'Unscalable structure: The existing framework could not smoothly accommodate expanding capabilities.',
            ],
          },
          {
            image: {
              seed: 'wz-heatmap-before',
              w: 2000,
              h: 1250,
              alt: 'Original Heatmap interface with mixed navigation patterns and inconsistent page headers',
            },
            caption:
              'The interface before the redesign, where navigation and page layouts changed from one feature to the next.',
            size: 'full',
          },
          'My brief was to bring structure back to the product without slowing down the team’s release schedule. Whatever I designed had to support every feature already live, leave room for the ones on the roadmap, and stay close to Heatmap’s evolving visual language.',
        ],
      },
      {
        title: 'Research',
        heading:
          'Before moving anything, I needed to see exactly where the interface broke down and why.',
        content: [
          'I started with a UI audit, capturing every screen, navigation element and page header on a single Figma board. Alongside it, I watched session recordings of customers using the product and sat in on conversations with the Full Sprint team to hear where users got stuck. Laying everything side by side made the inconsistencies hard to ignore: similar actions carried different labels, and the same filter appeared in several styles depending on the page.',
          {
            image: {
              seed: 'wz-heatmap-audit',
              w: 1600,
              h: 1000,
              alt: 'Figma board with screenshots of every Heatmap screen grouped by navigation pattern',
            },
            caption: 'UI audit board grouping every screen by the navigation pattern it used.',
            size: 'content',
          },
          {h3: 'Competitive analysis'},
          'Next, I reviewed five analytics and session-recording tools to see how they organized comparable feature sets. The strongest products shared three habits: a single persistent navigation, features grouped by the question a user is trying to answer, and account settings kept out of the everyday workspace. I used these patterns as benchmarks rather than templates, since Heatmap’s mix of heatmaps, recordings and AI insights didn’t map neatly onto any one product.',
          {
            gallery: [
              {
                seed: 'wz-heatmap-navs',
                w: 1200,
                h: 900,
                alt: 'Side-by-side comparison of sidebar navigation in competing analytics tools',
              },
              {
                seed: 'wz-heatmap-headers',
                w: 1200,
                h: 900,
                alt: 'Annotated screenshots comparing page header layouts',
              },
              {
                seed: 'wz-heatmap-matrix',
                w: 1200,
                h: 900,
                alt: 'Feature matrix comparing navigation depth and feature grouping',
              },
            ],
            caption:
              'Comparing navigation, page headers and feature grouping across analytics tools.',
          },
          {h3: 'Key insights'},
          {
            bullets: [
              'Users think in tasks, not features: they arrive with a question like “why are visitors leaving this page?” rather than looking for a specific tool.',
              'Everyday tools and admin were mixed together: settings and billing sat beside heatmaps and recordings.',
              'New features lacked a clear home: each release added another entry point instead of extending an existing one.',
              'Components had drifted: buttons, filters and date pickers existed in several near-identical versions.',
            ],
          },
        ],
      },
      {
        title: 'Design Process',
        heading: 'I fixed the structure before touching the screens, testing each layer as I went.',
        content: [
          'Using the research, I grouped every feature into a small set of task-based areas and mapped them into a new information architecture. Before committing to a layout, I ran a card sort and a quick tree test with the team, which surfaced a few labels that meant different things to different people. Renaming those early saved rounds of rework later.',
          {
            image: {
              seed: 'wz-heatmap-sitemap',
              w: 2000,
              h: 1400,
              alt: 'Information architecture diagram grouping Heatmap features into task-based areas',
            },
            caption:
              'The new information architecture, organized around tasks instead of the order features were launched.',
            size: 'full',
          },
          {h3: 'Wireframing'},
          'I explored three navigation models in low-fidelity wireframes: a top bar with dropdown menus, a collapsible sidebar, and a hybrid of the two. The sidebar won because it could absorb new sections without pushing others out of view, and it kept the working area wide enough for heatmaps and recordings. The trade-off was some horizontal space, which I recovered by letting the sidebar collapse to icons.',
          {
            gallery: [
              {
                seed: 'wz-heatmap-wiretop',
                w: 1200,
                h: 900,
                alt: 'Wireframe of a top bar navigation with dropdown menus',
              },
              {
                seed: 'wz-heatmap-wireside',
                w: 1200,
                h: 900,
                alt: 'Wireframe of a collapsible sidebar navigation',
              },
              {
                seed: 'wz-heatmap-wirehybrid',
                w: 1200,
                h: 900,
                alt: 'Wireframe of a hybrid top bar and sidebar layout',
              },
            ],
            caption: 'Three navigation models explored in low fidelity.',
          },
          'Once the structure held up, I moved into high-fidelity prototypes in Figma. Short recorded walkthroughs let developers and stakeholders review interactions on their own time, which kept feedback moving without extra meetings.',
          {
            video: SAMPLE_VIDEO,
            caption:
              'Prototype walkthrough: moving between heatmaps, recordings and insights with the new sidebar.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          'One sidebar, one page structure and one set of components that every feature can build on.',
        content: [
          {
            image: {
              seed: 'wz-heatmap-final',
              w: 2000,
              h: 1250,
              alt: 'Redesigned Heatmap dashboard with a task-based sidebar and unified page header',
            },
            caption: 'The redesigned dashboard.',
            size: 'full',
          },
          {h3: 'Navigation built around tasks'},
          'The new sidebar groups features by what the user is trying to do, with settings, billing and integrations moved to their own area at the bottom. Every page now shares the same header, with the title, date range and filters always in the same place. Users learn the layout once and carry that knowledge to every new feature.',
          {
            gallery: [
              {
                seed: 'wz-heatmap-sidebar',
                w: 1200,
                h: 900,
                alt: 'Expanded and collapsed states of the new sidebar',
              },
              {
                seed: 'wz-heatmap-pagehead',
                w: 1200,
                h: 900,
                alt: 'Unified page header with title, date range picker and filters',
              },
            ],
            caption: 'The sidebar’s expanded and collapsed states, and the shared page header.',
          },
          {h3: 'A component library built to scale'},
          'To stop the interface from drifting again, I consolidated near-duplicate buttons, filters, cards and tables into a single Figma component library. Each component was documented with its states and usage rules, so new features could be assembled from existing parts instead of designed from scratch. This also gave developers a clear reference when rebuilding pages.',
          {
            image: {
              seed: 'wz-heatmap-library',
              w: 1600,
              h: 1000,
              alt: 'Figma component library showing buttons, filters, cards and tables with their states',
            },
            caption: 'Part of the component library, with documented states and usage notes.',
            size: 'content',
          },
        ],
      },
      {
        title: 'Next Steps',
        heading:
          'Validating the new structure with real usage and extending the system as Heatmap grows.',
        content: [
          'The redesign set the foundation, but the real test is how it holds up as customers use it day to day and new features ship. I documented the navigation rules, page templates and component guidelines so the team could keep building on the system after my internship.',
          {
            bullets: [
              'Run usability tests on the live build to confirm users reach core tools more easily than before.',
              'Watch how customers discover new features through the sidebar rather than through support.',
              'Extend the component library to cover empty states, onboarding and AI insight cards.',
              'Bring the remaining secondary pages in line with the new page templates.',
            ],
          },
          {h3: 'What I learned'},
          'A redesign at this scale is mostly a structural problem, and the visual layer only works once the structure is right. Designing a system instead of individual screens also made the handoff smoother, because developers could reason about new pages using the same rules I did.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-munisync',
    title: 'Munisync App',
    slug: 'munisync-app',
    year: 2024,
    featured: true,
    order: 2,
    thumbnail: {seed: 'wz-munisync', w: 1600, h: 1136, alt: 'Munisync app on a phone'},
    description: 'A mobile app that keeps students in sync with campus events.',
    client: 'School project',
    discipline: 'UI/UX',
    intro:
      'Munisync is a mobile app that keeps students in sync with campus events. It puts event listings, study room bookings and reminders in one place, so students no longer have to piece their week together from emails, posters and group chats. I designed it as a school project in 2024 and took it from research to a tested high-fidelity prototype.',
    hero: {
      image: {
        seed: 'wz-munisync-app-hero',
        w: 2000,
        h: 1250,
        alt: 'Three phones showing the Munisync event feed, room booking and schedule screens',
      },
    },
    summary:
      'One app for finding campus events, booking study rooms and getting reminded before either one starts.',
    details: [
      {label: 'Role', value: 'Product Designer\nUX Researcher'},
      {label: 'Timeline', value: '10 weeks\nSpring 2024'},
      {label: 'Team', value: 'Solo designer\nWeekly critique with course peers'},
      {label: 'Skills & Tools', value: 'Figma\nFigJam\nMaze\nUser interviews\nUsability testing'},
    ],
    overview:
      'At my school, the information students needed to plan their week lived in at least five places: department newsletters, club social accounts, printed posters, the student union website and a separate portal for booking study rooms. Students told me they often heard about talks and workshops the day after they happened. For this course project I set out to design one mobile app that brings all of this together. I ran the work end to end over ten weeks, from interviews and a survey, through mapping the current experience, to sketches and a tested prototype. The final design covers three core jobs: discovering events, booking rooms and getting reminded at the right time.',
    impact:
      'In final testing, students booked a study room in 38 seconds on average, down from over three minutes in the existing portal. 9 of 10 participants said they would use Munisync every week.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'Students were missing events they wanted to attend because the information was scattered.',
        content: [
          "Campus events at my school were announced through department newsletters, club social accounts, printed posters and the student union website. Study rooms were booked through a separate library portal that did not work well on a phone. Students had to check several places to plan a single day, and most of them simply didn't. The result was half-empty workshops and students who only heard about them afterwards.",
          {
            image: {
              seed: 'wz-munisync-app-posters',
              w: 1600,
              h: 1000,
              alt: 'Crowded campus noticeboard covered in overlapping event posters',
            },
            caption:
              'A typical noticeboard outside the library. Most of these posters were for events that had already passed.',
            size: 'content',
          },
          {
            bullets: [
              'Event details were split across four channels, and none of them was complete.',
              'The room booking portal took over three minutes to use on a phone and often timed out.',
              'Reminders depended on students copying events into their own calendars by hand.',
              'Clubs and departments had no shared way to reach students beyond their existing followers.',
            ],
          },
          'I framed the project around one question: how might we help students see what is happening on campus and plan around it without adding yet another channel to check? To earn a place on a home screen, the app had to replace steps rather than add them.',
        ],
      },
      {
        title: 'Research',
        heading:
          'I talked to students before sketching anything, and their weeks looked nothing like the course calendar.',
        content: [
          {h3: 'Interviews and a campus survey'},
          'I interviewed eight students, from first year to graduate level, including two commuters and one student who worked part-time. Each 30-minute session began with them walking me through their last week on their own phone. I followed up with a short survey that got 64 responses, which let me check whether the interview patterns held beyond my own circle. I also timed five students booking a study room in the existing portal to set a baseline.',
          {
            image: {
              seed: 'wz-munisync-app-affinity',
              w: 2000,
              h: 1250,
              alt: 'Affinity map of interview notes grouped into colored clusters on a digital whiteboard',
            },
            caption:
              'I grouped around 180 interview notes into themes in FigJam. Timing and trust came up far more often than I expected.',
            size: 'full',
          },
          {h3: 'What I learned'},
          {
            bullets: [
              "Students weren't short on interest: 71% of survey respondents had missed an event they would have attended.",
              'Group chats were the most trusted source, because a friend had already filtered out the noise.',
              'Commuter students planned their whole day around room availability, not class times.',
              'Reminders only helped if they arrived with enough time to act, not at the moment an event started.',
            ],
          },
          {
            gallery: [
              {
                seed: 'wz-munisync-app-persona',
                w: 1200,
                h: 900,
                alt: 'Persona of a commuter student who plans her day around available study space',
              },
              {
                seed: 'wz-munisync-app-journey',
                w: 1200,
                h: 900,
                alt: 'Journey map of finding an event and booking a study room with the current tools',
              },
            ],
            caption:
              'Every design decision that followed was checked against the commuter persona and the current-state journey map.',
          },
        ],
      },
      {
        title: 'Design Process',
        heading:
          'I cut the scope to three jobs and tested the structure on paper before drawing any polished screens.',
        content: [
          'My first feature list included messaging, club pages, a campus map and a marketplace. I scored each idea against the research on two things: how often students needed it and how badly the current tools handled it. Three jobs stood out: discovering events, booking rooms and getting reminded. Everything else went into a parking lot for later.',
          {
            image: {
              seed: 'wz-munisync-app-sitemap',
              w: 1600,
              h: 1000,
              alt: 'Information architecture diagram for the three core tabs: Events, Rooms and Schedule',
            },
            caption: 'With only three tabs, the navigation could be explained in one sentence.',
            size: 'content',
          },
          'I sketched several directions for the home screen and built paper prototypes of the two strongest. I tested them with five students in the library, asking each to find a talk that week and book a room before it started. One layout led with a calendar and the other with a feed of events. The feed won, because students browsed by interest before they thought about time.',
          {
            gallery: [
              {
                seed: 'wz-munisync-app-wire-feed',
                w: 900,
                h: 1600,
                alt: 'Grayscale wireframe of the event feed on a phone screen',
              },
              {
                seed: 'wz-munisync-app-wire-rooms',
                w: 900,
                h: 1600,
                alt: 'Grayscale wireframe of the room booking flow on a phone screen',
              },
              {
                seed: 'wz-munisync-app-wire-schedule',
                w: 900,
                h: 1600,
                alt: 'Grayscale wireframe of the schedule and reminders tab on a phone screen',
              },
            ],
            caption: 'Mid-fidelity wireframes after the first round of paper testing.',
          },
          {h3: 'What changed after testing'},
          'Right after RSVPing to an event, students kept looking for a way to book a room nearby. I added a prompt to the event confirmation screen that suggests free rooms in the same building. Participants also kept asking which building an event was in, so I brought back one small piece of the parked map idea as an inline map on each event page.',
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          "The final app answers three questions students ask every day: what's on, where can I work and what's next.",
        content: [
          {h3: 'An event feed that fits your week'},
          "The home feed ranks events by the student's program, the clubs they follow and the gaps in their timetable. Each card shows the time, the location and how many friends are going, because research showed students trusted events their friends had already picked. RSVPing adds the event to the Schedule tab and to the phone's own calendar in one step.",
          {
            gallery: [
              {
                seed: 'wz-munisync-app-feed',
                w: 900,
                h: 1600,
                alt: "Event feed filtered by the student's program and followed clubs",
              },
              {
                seed: 'wz-munisync-app-event',
                w: 900,
                h: 1600,
                alt: 'Event detail screen with an RSVP button, an inline map and a list of friends attending',
              },
              {
                seed: 'wz-munisync-app-saved',
                w: 900,
                h: 1600,
                alt: 'Schedule tab showing saved events and an upcoming room booking',
              },
            ],
            caption: 'The event feed, event detail and schedule screens.',
          },
          {h3: 'Booking and reminders in a few taps'},
          "Room booking starts from what students already know: when they're free and roughly where they'll be. They choose a time block, see available rooms sorted by distance and confirm with one tap. By default, reminders arrive 15 minutes before a booking or event, and if nobody checks into a booked room, a follow-up nudge lets the student release it for someone else.",
          {
            video: SAMPLE_VIDEO,
            caption:
              'Prototype walkthrough: RSVP to a workshop, then book a nearby room for the hour before it starts.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Outcome',
        heading:
          'In final testing, students booked study rooms five times faster and found relevant events without help.',
        content: [
          'I ran a final round of testing with ten students: five in moderated sessions in person and five as unmoderated tests in Maze. Each participant did the same three tasks: find an event that matched their interests, RSVP to it, and book a study room for the hour before it. I compared their completion times with the baseline I recorded during research.',
          {
            bullets: [
              'Average time to book a study room fell from 3 min 12 s to 38 seconds.',
              'All ten participants found a relevant event without help.',
              '9 of 10 said they would open Munisync at least once a week.',
              'The most common request was a way to mute event categories they had no interest in.',
            ],
          },
          {
            image: {
              seed: 'wz-munisync-app-screens',
              w: 2000,
              h: 1400,
              alt: 'Final high-fidelity Munisync screens arranged side by side in a grid',
            },
            caption:
              'The final set of 24 high-fidelity screens, built on a small component library in Figma.',
            size: 'full',
          },
          'Not everything worked. Two participants expected to find events they had dismissed in a separate list, and one student who had booked a room for a friend found the check-in nudge pushy. I kept the nudge because it frees up rooms for everyone who is waiting, but I softened the wording and added an option to share a booking with another student.',
        ],
      },
      {
        title: 'Next Steps',
        heading:
          "If Munisync went beyond a class project, I'd design for the people who post the events next.",
        content: [
          "The student side only works if events are complete and up to date. The next phase would be a simple web dashboard where clubs and departments publish an event once and reach students directly, in place of posters and newsletters. It would also need a light review step so the feed doesn't fill up with duplicate or outdated listings.",
          {
            bullets: [
              'Interview club leaders and department staff about how they publish events today.',
              'Add category muting and a list of dismissed events, based on test feedback.',
              'Run an accessibility review with screen reader users on iOS and Android.',
              "Test whether the library's live room occupancy data is reliable enough to show in the app.",
            ],
          },
          'The biggest lesson for me was how much scoping mattered. Parking the full campus map, messaging and marketplace ideas early left me time to test three flows properly instead of spreading myself thin across every feature on my first list.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-transit',
    title: 'Transit Companion',
    slug: 'transit-companion',
    year: 2025,
    featured: true,
    order: 3,
    thumbnail: {seed: 'wz-transit', w: 1600, h: 1600, alt: 'Transit app concept'},
    description: 'A concept for calmer, more predictable commutes.',
    client: 'Personal project',
    discipline: 'UI/UX',
    intro:
      'Transit Companion is a concept app that answers one question for daily commuters: when should I leave? Instead of a wall of arrival times, it turns live transit data into a single, calm recommendation and only speaks up when something changes. I designed it as a self-initiated project in 2025 to explore how real-time information can feel less stressful.',
    hero: {video: SAMPLE_VIDEO},
    summary: 'A transit app that tells you when to leave, not just when the bus arrives.',
    details: [
      {label: 'Role', value: 'Product designer (solo)\nResearch, UX, UI, prototyping'},
      {label: 'Timeline', value: '10 weeks\nSpring 2025'},
      {label: 'Platform', value: 'iOS app\nHome and lock screen widgets'},
      {label: 'Skills & Tools', value: 'Diary study\nUsability testing\nFigma\nProtoPie'},
    ],
    overview:
      'Most transit apps are built around the timetable: they show every route, every stop and every arrival, and leave the rider to do the math. For someone who takes the same trip twice a day, that means opening the app, scanning a few screens and still second-guessing whether to run for the door. I set out to design a companion that works backwards from when you need to arrive, accounts for walking time and how reliable the route has been, and gives you one leave-by time. The project covered interviews with regular commuters, a two-week diary study, concept testing and a high-fidelity iOS prototype. The main idea was that calm comes from predictability, so the design is as much about what the app leaves out as what it shows.',
    impact:
      'In prototype testing, commuters found their leave-by time in about 4 seconds, compared with 19 seconds in the apps they use now, and 7 of 8 said they would switch to it for their daily trip.',
    showSideMenu: false,
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'Live transit data is everywhere, but commuters are still unsure when to walk out the door.',
        content: [
          "Arrival boards and trip planners answer 'when is the next bus?', but commuters are really asking 'when do I need to leave?' They bridge the gap between those two questions with mental math: walking time, the chance of missing a connection and a buffer in case the vehicle comes early. Every trip starts with a small calculation, and every calculation adds a little stress.",
          {
            image: {
              seed: 'wz-transit-companion-stops',
              w: 1600,
              h: 1000,
              alt: 'Screenshots of a typical arrival list showing a dozen routes and departure times',
            },
            caption:
              "A typical arrival screen: accurate and dense, but it doesn't tell you what to do next.",
            size: 'content',
          },
          {h3: 'Who this is for'},
          "I focused on people who repeat the same trip most days, such as office workers, students and shift workers. They know their route by heart, so they don't need trip planning. What they need is a quick, trustworthy read on today's conditions and a nudge when those conditions change.",
          {
            bullets: [
              'How might we turn live arrivals into one clear leave-by time for a trip the rider already knows?',
              'How might we show uncertainty honestly without making people more anxious?',
              'How might we warn riders about disruptions early enough to act, and stay quiet the rest of the time?',
            ],
          },
        ],
      },
      {
        title: 'Research',
        heading: "Commuters didn't want more information; they wanted fewer decisions.",
        content: [
          'I interviewed 8 regular transit riders, then ran a two-week diary study with 5 of them where they logged each commute and noted how they decided when to leave. I also reviewed five transit and navigation apps to see how each one handles live times, delays and notifications. The diary entries told me the most: participants checked their app three times on average before a single trip.',
          {
            gallery: [
              {
                seed: 'wz-transit-companion-diary',
                w: 1200,
                h: 900,
                alt: 'Diary study entries sorted on a wall by time of day',
              },
              {
                seed: 'wz-transit-companion-interview',
                w: 1200,
                h: 900,
                alt: 'Remote interview with a commuter walking through their morning routine',
              },
              {
                seed: 'wz-transit-companion-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of interview and diary study notes',
              },
            ],
            caption: 'Diary entries, interviews and synthesis over two weeks.',
          },
          {h3: 'Key findings'},
          {
            bullets: [
              "Riders add their own buffer of 3 to 8 minutes because they don't trust the times on screen.",
              'Most of the stress happens in the 10 minutes before leaving, not during the trip.',
              'Most participants had turned off push alerts because they went off for lines they never used.',
              "People trusted an app more when it admitted uncertainty, like 'usually 2 minutes late', than when it showed a precise time that turned out wrong.",
            ],
          },
          {
            image: {
              seed: 'wz-transit-companion-journey',
              w: 2000,
              h: 1250,
              alt: 'Journey map of a morning commute highlighting moments of stress',
            },
            caption:
              'Journey map of a typical morning commute. Stress peaks before the rider even leaves home.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Process',
        heading: 'I designed around a single time, then tested how much context it needed.',
        content: [
          'I started with the smallest useful answer: a leave-by time for a saved trip. Early sketches explored countdowns, timelines and a traffic-light status, and I tested paper versions with four participants to see which one they could read at a glance. The countdown was the fastest to read but made people panic in the last few minutes, so I switched to a fixed leave-by time with a gentle progress indicator.',
          {
            gallery: [
              {
                seed: 'wz-transit-companion-sketches',
                w: 1200,
                h: 900,
                alt: 'Early paper sketches of countdown and timeline concepts',
              },
              {
                seed: 'wz-transit-companion-wireframes',
                w: 1200,
                h: 900,
                alt: 'Low-fidelity wireframes of the saved-trip home screen',
              },
            ],
            caption:
              'Sketches and wireframes comparing the countdown, timeline and leave-by concepts.',
          },
          {h3: 'Designing for uncertainty'},
          'Showing confidence was the hardest part. I tried percentages, time ranges and colour-coded reliability, but percentages felt abstract, ranges were hard to act on and colour alone was easy to miss. What worked was plain language plus a built-in buffer: the app adds a margin based on how reliable the route has been and explains it in words.',
          {
            video: SAMPLE_VIDEO,
            caption:
              'Prototype walkthrough: the leave-by time updates when a delay is detected, and the rider gets one calm alert.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          'A calm home screen, alerts that stay quiet until they matter, and widgets that answer the question before you open the app.',
        content: [
          {h3: 'One trip, one answer'},
          "The home screen shows the next saved trip with a large leave-by time, the walk to the stop and one line of status. Secondary details like alternate routes and live vehicle positions are one tap away. Motion is slow and minimal, and times update in place instead of jumping, so the screen never feels like it's racing you.",
          {
            gallery: [
              {
                seed: 'wz-transit-companion-home',
                w: 900,
                h: 1600,
                alt: 'Home screen showing a leave-by time of 8:12 with a 6-minute walk to the stop',
              },
              {
                seed: 'wz-transit-companion-delay',
                w: 900,
                h: 1600,
                alt: 'Delay state with an updated leave-by time and a plain-language explanation',
              },
              {
                seed: 'wz-transit-companion-alt',
                w: 900,
                h: 1600,
                alt: 'Alternate route sheet comparing two options by arrival time',
              },
            ],
            caption: 'Home, delay and alternate route states.',
          },
          {h3: 'Alerts that earn their place'},
          'Notifications only go out for saved trips, and only when the leave-by time moves by more than two minutes. Each alert says what changed, what to do and how sure the app is. Riders can set quiet hours so the app stays silent outside their commute.',
          {
            image: {
              seed: 'wz-transit-companion-widgets',
              w: 2000,
              h: 1400,
              alt: 'Lock screen and home screen widgets showing the next leave-by time',
            },
            caption:
              "Widgets put the answer on the lock screen, so most checks don't need the app at all.",
            size: 'full',
          },
          {
            image: {
              seed: 'wz-transit-companion-uikit',
              w: 1600,
              h: 1000,
              alt: 'UI kit with type scale, muted colour palette and status components',
            },
            caption:
              'A restrained palette and type scale. Colour only appears when a status changes.',
            size: 'content',
          },
        ],
      },
      {
        title: 'Outcome',
        heading: 'In testing, a single honest answer made commutes feel more predictable.',
        content: [
          'I tested the high-fidelity prototype with 8 commuters across three scenarios: a normal morning, a delayed bus and a missed connection. On average, participants found their leave-by time in about 4 seconds, compared with 19 seconds in the apps they use now. Seven of eight said they would use it for their daily trip, and several said the plain-language delay messages felt more like a heads-up from a friend than a system alert.',
          {
            image: {
              seed: 'wz-transit-companion-testing',
              w: 2000,
              h: 1250,
              alt: 'Usability testing session with a participant using the prototype on a phone',
            },
            caption: 'Moderated testing sessions with the high-fidelity prototype.',
            size: 'full',
          },
          {h3: 'Next steps'},
          {
            bullets: [
              'Check the reliability buffer against historical data from an open transit feed',
              'Design for accessibility needs such as step-free routes and screen reader announcements when times change',
              'Test a shared trip mode for families and carpools',
            ],
          },
          'My biggest takeaway was that calm is a product decision, not a visual style. Most of the work was deciding what to leave out and when the app should stay quiet. If I took this further, I would pilot it with a small group on one transit network to see whether the trust from testing holds up over weeks of real use.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-identity',
    title: 'Studio Identity',
    slug: 'studio-identity',
    year: 2023,
    featured: true,
    order: 4,
    thumbnail: {seed: 'wz-identity', w: 1600, h: 1136, alt: 'Brand identity mockups'},
    description: 'A visual identity for a small design studio.',
    client: 'Freelance',
    discipline: 'Branding',
    intro:
      "A visual identity for a small, independent design studio growing from a founder-led practice into a team of four. I designed the logo, typography, colour palette and a set of applications across stationery, signage and the studio's website. The goal was an identity quiet enough to sit behind client work, with enough character to be recognised on its own.",
    hero: {
      image: {
        seed: 'wz-studio-identity-hero',
        w: 2000,
        h: 1250,
        alt: 'Studio identity shown across business cards, letterhead and an envelope on a concrete surface',
      },
    },
    summary:
      "A quiet, modular identity that lets the studio's work lead while staying unmistakably its own.",
    details: [
      {label: 'Role', value: 'Brand designer\nArt director'},
      {label: 'Timeline', value: '10 weeks, 2023'},
      {label: 'Team', value: 'Solo designer\nTwo studio founders\nFreelance web developer'},
      {label: 'Skills & Tools', value: 'Figma\nIllustrator\nInDesign\nGlyphs\nAfter Effects'},
    ],
    overview:
      "The studio had worked under its founders' names for six years and was about to hire its first two designers. Its existing mark was those names typed in a default grotesque, and every proposal, invoice and social post looked slightly different. The founders wanted an identity that reflected how the studio actually works: careful, collaborative and focused on the details most people never notice. I ran a short discovery phase, explored three distinct directions, and developed the chosen one into a full system with guidelines the team could use without me. The work covered the logo, a type pairing, colour, a layout grid, stationery, office signage and a refreshed website.",
    impact:
      'Inbound enquiries doubled in the six months after launch, and every proposal, invoice and deck now comes from shared templates the team maintains on its own.',
    showSideMenu: false,
    sections: [
      {
        title: 'Brief',
        heading:
          'The studio had outgrown a name set in a default typeface and needed an identity that could scale with a team.',
        content: [
          "The founders came to me with a clear problem: their work had matured, but their own brand hadn't. Proposals were built from scratch each time, the website hadn't been updated in three years, and the logo was whatever font happened to be installed. With two new hires starting in the autumn, they needed a system other people could use consistently.",
          {h3: 'What we set out to do'},
          {
            bullets: [
              'Create a mark that works at 16 pixels and on a three-metre wall',
              'Define a type and colour system that stays out of the way of client work',
              'Build templates for proposals, invoices and case study decks',
              'Ship stationery, office signage and a website refresh within one quarter',
            ],
          },
          'I started with a half-day workshop with both founders, followed by short interviews with four long-term clients. I asked each client how they would describe the studio to a colleague, and the same words kept coming up: calm, precise and easy to work with. Those three words became the filter for every decision that followed.',
          {
            image: {
              seed: 'wz-studio-identity-workshop',
              w: 1600,
              h: 1000,
              alt: 'Sticky notes from the brand workshop grouped into themes on a whiteboard',
            },
            caption:
              'Workshop output: words the founders and clients used to describe the studio, clustered into themes.',
            size: 'content',
          },
          {
            gallery: [
              {
                seed: 'wz-studio-identity-audit',
                w: 1200,
                h: 900,
                alt: "Audit of the studio's existing proposals, invoices and social posts laid out side by side",
              },
              {
                seed: 'wz-studio-identity-before',
                w: 1200,
                h: 900,
                alt: 'The previous wordmark set in a default grotesque on an old proposal cover',
              },
            ],
            caption:
              'An audit of existing materials turned up six different typefaces and no shared layout.',
          },
        ],
      },
      {
        title: 'Exploration',
        heading:
          'Three directions tested one question: how much personality the studio could carry before it competed with its own work.',
        content: [
          'I explored three routes, each pushing the brief in a different direction. The first was strictly typographic, the second built on a simple geometric symbol, and the third used a frame device borrowed from the way the studio pins work to the wall during reviews. I kept each route rough so the founders reacted to the idea rather than the polish.',
          {
            gallery: [
              {
                seed: 'wz-studio-identity-typographic',
                w: 1200,
                h: 1200,
                alt: 'Route A: a custom typographic wordmark with tightened letterspacing',
              },
              {
                seed: 'wz-studio-identity-symbol',
                w: 1200,
                h: 1200,
                alt: 'Route B: a geometric monogram built from a square and a quarter circle',
              },
              {
                seed: 'wz-studio-identity-frame',
                w: 1200,
                h: 1200,
                alt: 'Route C: corner brackets framing the studio name',
              },
            ],
            caption: 'Three early routes: typographic, symbol and frame.',
          },
          {h3: 'Testing the routes in context'},
          'Instead of presenting logos on a blank page, I mocked each route onto a proposal cover, an email signature, a social tile and a door sign. This made the trade-offs obvious quickly. The symbol looked strong at large sizes but felt generic in small, text-heavy contexts, while the typographic route disappeared on signage.',
          {
            image: {
              seed: 'wz-studio-identity-context',
              w: 2000,
              h: 1250,
              alt: 'The three routes mocked onto proposal covers, email signatures and door signs in a comparison grid',
            },
            caption: 'Each route tested on the same four real-world touchpoints.',
            size: 'full',
          },
          'The frame route won because it did two jobs at once. It worked as a logo lockup, and the corner brackets could be pulled apart to frame images, headlines and project titles across every application. We agreed to carry it forward and borrow the careful letterspacing from the typographic route.',
        ],
      },
      {
        title: 'Identity System',
        heading:
          'A custom wordmark, four corner brackets and a restrained palette form a system the whole team can apply consistently.',
        content: [
          "I redrew the wordmark in Glyphs, starting from a neo-grotesque, opening the apertures and loosening the spacing so it stays legible at small sizes. The brackets share the stroke weight of the wordmark's stems, so the lockup reads as one object. I also drew a compact mark that pairs the brackets with the studio's initial for favicons and social avatars.",
          {
            gallery: [
              {
                seed: 'wz-studio-identity-wordmark',
                w: 1200,
                h: 1200,
                alt: 'Final wordmark on a construction grid showing stroke weights and spacing',
              },
              {
                seed: 'wz-studio-identity-monogram',
                w: 1200,
                h: 1200,
                alt: 'Compact bracket mark shown as a favicon and social avatar',
              },
            ],
            caption:
              'The primary wordmark and compact mark share the same stroke weight and corner radius.',
          },
          {
            video: SAMPLE_VIDEO,
            caption:
              'Motion study: the brackets open to frame content, then close back around the wordmark.',
            size: 'full',
          },
          {h3: 'Type and colour'},
          'The type pairing is a neutral sans for interface and body text and a serif for pull quotes and case study titles, used sparingly. Colour is mostly off-white and near-black, with a single warm clay accent that appears in fewer than one in ten layouts. Keeping the accent rare made it feel intentional whenever it does show up.',
          {
            image: {
              seed: 'wz-studio-identity-palette',
              w: 2000,
              h: 1400,
              alt: 'Type specimen and colour palette with off-white, near-black and clay accent swatches',
            },
            caption: 'Type specimen and palette, with recommended usage ratios for each colour.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Applications',
        heading:
          'Every touchpoint uses the same frame device, from business cards to the sign on the studio door.',
        content: [
          'Stationery was printed on an uncoated, off-white stock to match the palette, with the brackets blind-debossed on business cards so the mark is felt more than seen. I built the letterhead and invoice templates in both InDesign and Google Docs, since most day-to-day documents are written quickly and edited collaboratively rather than laid out by hand.',
          {
            gallery: [
              {
                seed: 'wz-studio-identity-cards',
                w: 1200,
                h: 1200,
                alt: 'Blind-debossed business cards on uncoated off-white stock',
              },
              {
                seed: 'wz-studio-identity-letterhead',
                w: 1200,
                h: 1200,
                alt: 'Letterhead and invoice template with a bracketed header',
              },
              {
                seed: 'wz-studio-identity-envelope',
                w: 1200,
                h: 1200,
                alt: 'Envelope and compliment slip carrying the compact bracket mark',
              },
            ],
            caption: 'The stationery set on uncoated stock.',
          },
          {
            image: {
              seed: 'wz-studio-identity-signage',
              w: 2000,
              h: 1400,
              alt: 'Brushed aluminium door sign with the wordmark at the studio entrance',
            },
            caption: 'Door signage in brushed aluminium, fabricated with a local sign maker.',
            size: 'full',
          },
          "On the website, the brackets became the main layout device. Project thumbnails snap into the frame on hover, and case study pages use the brackets to mark the active section. I designed the site in Figma and worked with the studio's freelance developer on a small component library, so new projects can be added without touching the layout.",
          {
            gallery: [
              {
                seed: 'wz-studio-identity-homepage',
                w: 1200,
                h: 900,
                alt: 'Studio website home page with a project grid and bracketed hover states',
              },
              {
                seed: 'wz-studio-identity-casepage',
                w: 1200,
                h: 900,
                alt: 'Project page template with bracketed section headings',
              },
            ],
            caption: 'Home page and project template from the refreshed website.',
          },
          {
            bullets: [
              'Proposal and case study deck templates in Google Slides and Keynote',
              'Letterhead, invoice and contract templates in Google Docs and InDesign',
              'Social post and story templates in Figma',
              'Email signature and presentation title cards',
            ],
          },
        ],
      },
      {
        title: 'Outcome',
        heading:
          'The studio now presents itself with the same care it gives its clients, and the team keeps it consistent on its own.',
        content: [
          'The identity launched with the new website in the autumn, timed to the two new hires starting. Six months later, inbound enquiries had doubled and every proposal and invoice leaving the studio came from the shared templates. The founders also told me the new materials helped them pitch for larger projects than before.',
          {
            image: {
              seed: 'wz-studio-identity-office',
              w: 2000,
              h: 1250,
              alt: 'Studio interior with the wordmark on the wall behind a shared worktable',
            },
            caption: 'The wordmark on the studio wall above the shared worktable.',
            size: 'full',
          },
          "I handed over a 24-page guidelines document with the source files and ran a one-hour walkthrough with the whole team. The guidelines focus on when to use each element, not only how, with examples drawn from the studio's own projects. I kept the rules short enough that people would actually read them.",
          {
            image: {
              seed: 'wz-studio-identity-guidelines',
              w: 1600,
              h: 1000,
              alt: 'Spreads from the brand guidelines showing logo clear space and misuse examples',
            },
            caption: 'Guideline spreads covering clear space, bracket usage and common mistakes.',
            size: 'content',
          },
          {h3: 'What I learned'},
          'Testing directions in context early saved at least one round of revisions, because the founders could see how each idea would live day to day. If I did it again, I would bring the developer in during exploration rather than after, since the bracket hover states took more iteration than I expected. The founders have since asked me to extend the system to a small printed book of their work.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-user-flow-optimization',
    title: 'User Flow Optimization',
    slug: 'user-flow-optimization',
    year: 2025,
    featured: false,
    order: 10,
    thumbnail: {
      seed: 'wz-list-user-flow-optimization',
      w: 1200,
      h: 900,
      alt: 'User Flow Optimization',
    },
    description: 'Cutting steps out of a checkout flow without losing clarity.',
    client: 'Mock client — e-commerce startup',
    discipline: 'UI/UX',
    intro:
      'An e-commerce startup was losing most of its shoppers between the cart and the confirmation page. I redesigned the checkout, replacing the five pages after the cart with one page in three sections, and kept every cost and decision in view. The work covered analytics, usability sessions, prototyping and an A/B test on the live store.',
    hero: {
      image: {
        seed: 'wz-user-flow-optimization-hero',
        w: 2000,
        h: 1250,
        alt: 'Mobile and desktop screens of the redesigned single-page checkout side by side',
      },
    },
    summary:
      'Fewer steps, not fewer answers: a checkout that asks only what it needs and always shows shoppers where they stand.',
    details: [
      {label: 'Role', value: 'Lead Product Designer'},
      {label: 'Timeline', value: '12 weeks\nFeb – Apr 2025'},
      {label: 'Team', value: '1 Product Manager\n2 Engineers\n1 Data Analyst'},
      {label: 'Skills & Tools', value: 'Figma\nFunnel analysis\nUsability testing\nPrototyping'},
    ],
    overview:
      'The client is an early-stage e-commerce startup that sells home goods online, and most of its traffic comes from phones. Counting the cart, its checkout had grown to six pages, and two out of three shoppers who reached the cart left before paying. As lead designer on a small squad, I ran the research, went through every question the flow asked, and designed a single-page checkout with three collapsible sections. Delivery dates, costs and order details stayed visible the whole way through, so fewer steps did not mean hiding anything. We checked the new flow in a four-week A/B test and then released it to all shoppers.',
    impact:
      'Checkout completion rose from 32% to 41% in a four-week A/B test, and median time from cart to order fell by more than a minute and a half.',
    sections: [
      {
        title: 'Problem Statement',
        heading: 'Two out of three shoppers who reached the cart never placed an order.',
        content: [
          "The store's checkout had grown one feature at a time. By early 2025 it was six separate pages: cart, account creation, shipping address, delivery method, payment and a final review. Each page made sense by itself, but together they made shoppers create an account before they had seen a single shipping cost. Only 32% of sessions that reached the cart ended in an order.",
          {
            image: {
              seed: 'wz-user-flow-optimization-funnel',
              w: 1600,
              h: 1000,
              alt: 'Bar chart of drop-off at each of the six original checkout steps',
            },
            caption:
              'The original funnel. The biggest drops came at account creation and when shoppers first saw shipping costs.',
            size: 'content',
          },
          "Mobile made it worse. About 70% of checkout traffic came from phones, where every page load and form field used up more of a shopper's patience. The team had tried small fixes like shorter labels and a progress bar, but none of them raised the completion rate by more than a point.",
          {h3: 'The brief'},
          {
            bullets: [
              'Reduce the number of steps between cart and order confirmation.',
              'Keep costs, delivery dates and order details visible before the shopper pays.',
              'Ship within one quarter using the existing payment provider and design system.',
              'Do not increase order errors or support tickets about wrong addresses.',
            ],
          },
        ],
      },
      {
        title: 'Research',
        heading:
          'The number of steps mattered less than the order in which shoppers had to decide things.',
        content: [
          'I started with the data we already had, then watched people use the flow. I wanted to know where shoppers left and also what they were trying to do when they left.',
          {h3: 'Funnel and session analysis'},
          'With the data analyst, I split the funnel by device, new versus returning customer and cart value. New customers on mobile dropped at twice the rate of returning ones, and nearly all of that happened on the account creation page. Session recordings showed a second pattern: shoppers went back from the payment page to the delivery page to check the shipping cost, because the payment page did not show it next to the total.',
          {
            image: {
              seed: 'wz-user-flow-optimization-journey',
              w: 2000,
              h: 1250,
              alt: 'Journey map of the original six-step checkout with pain points marked at each step',
            },
            caption: 'Journey map built from 40 session recordings and the funnel breakdown.',
            size: 'full',
          },
          {h3: 'Usability sessions'},
          'I ran eight moderated video sessions with recent customers and with people who had abandoned a cart in the past month. Each person went through a full purchase on a staging store with a test card and talked through what they were doing. Afterward, I grouped every observation on an affinity board to find patterns across sessions.',
          {
            gallery: [
              {
                seed: 'wz-user-flow-optimization-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of usability session notes grouped by theme',
              },
              {
                seed: 'wz-user-flow-optimization-sessions',
                w: 1200,
                h: 900,
                alt: 'Observation grid tracking where each participant hesitated or went back a step',
              },
            ],
            caption:
              'Three themes stood out: surprise costs, forced sign-up and retyping details the phone already knew.',
          },
        ],
      },
      {
        title: 'Design Process',
        heading: 'I listed every question the checkout asked, then moved or removed each one.',
        content: [
          'Before drawing any screens, I listed every field and decision in the old flow, 23 in all, and asked three things about each: do we need it, do we need it now, and can we fill it in for the shopper? Five fields went away entirely, including a second phone number and a set of marketing preference checkboxes. Four more could be filled in automatically from the address or the device.',
          {
            image: {
              seed: 'wz-user-flow-optimization-audit',
              w: 2000,
              h: 1400,
              alt: 'Field audit table listing the 23 questions in the original checkout, each tagged keep, move, autofill or remove',
            },
            caption: 'The field audit. Each row is one question the old checkout asked.',
            size: 'full',
          },
          'With fewer questions to ask, I tried three structures: one long page, a three-step wizard, and a single page with collapsible sections. I built a mobile prototype of each and ran unmoderated tests with five shoppers per version. I measured time on task and afterward asked people to recall their order total and delivery date.',
          {
            gallery: [
              {
                seed: 'wz-user-flow-optimization-longpage',
                w: 900,
                h: 1600,
                alt: 'Mobile prototype of a single long-page checkout',
              },
              {
                seed: 'wz-user-flow-optimization-wizard',
                w: 900,
                h: 1600,
                alt: 'Mobile prototype of a three-step wizard checkout',
              },
              {
                seed: 'wz-user-flow-optimization-accordion',
                w: 900,
                h: 1600,
                alt: 'Mobile prototype of a single-page checkout with collapsible sections',
              },
            ],
            caption:
              'The three structures tested on mobile: long page, wizard and collapsible sections.',
          },
          {
            video: SAMPLE_VIDEO,
            caption: 'Prototype walkthrough of the collapsible-section checkout on mobile.',
            size: 'content',
          },
          'The long page was fastest, but people lost track of what they had already filled in. The wizard was clear but felt as slow as the original. Collapsible sections were nearly as fast as the long page, showed a short summary of each finished part, and all five testers could recall their total afterward.',
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'One page, three sections, and the order total visible from the first tap.',
        content: [
          'The first change was to make guest checkout the default. Shoppers now enter an email address and go straight to shipping, and account creation moved to the confirmation page as one optional password field, since we already had the rest of their details. Express payment buttons sit at the top for people who want to skip the form altogether.',
          {
            gallery: [
              {
                seed: 'wz-user-flow-optimization-contact',
                w: 900,
                h: 1600,
                alt: 'Mobile checkout section for contact and shipping address with address autocomplete open',
              },
              {
                seed: 'wz-user-flow-optimization-delivery',
                w: 900,
                h: 1600,
                alt: 'Mobile checkout section for delivery options showing price and expected delivery date for each',
              },
              {
                seed: 'wz-user-flow-optimization-payment',
                w: 900,
                h: 1600,
                alt: 'Mobile checkout payment section with the order total pinned above the pay button',
              },
            ],
            caption:
              'The three sections of the new checkout: contact and shipping, delivery, and payment.',
          },
          {h3: 'Clarity without a review page'},
          'Removing the review step was the riskiest call, because that was where shoppers caught their own mistakes. Instead, each finished section collapses into a short summary that can still be edited, and the total with shipping and tax stays pinned above the pay button. Delivery dates now appear next to each shipping option instead of on a later page.',
          {
            image: {
              seed: 'wz-user-flow-optimization-desktop',
              w: 2000,
              h: 1250,
              alt: 'Desktop checkout with the three sections on the left and a persistent order summary on the right',
            },
            caption:
              'On desktop, the order summary stays fixed beside the form so the total is always in view.',
            size: 'full',
          },
          {h3: 'Smaller fixes inside the form'},
          {
            bullets: [
              'Address autocomplete that fills in city, region and postal code from one field.',
              'Inline validation that checks each field when the shopper leaves it instead of on submit.',
              'Card type detected from the first few digits, so there is no dropdown to pick it from.',
              'Numeric keyboards on mobile for postal code, phone and card fields.',
            ],
          },
        ],
      },
      {
        title: 'Outcome',
        heading: 'Checkout completion rose nine points with no increase in order errors.',
        content: [
          "We released the new flow as a 50/50 A/B test for four weeks, covering about 18,000 checkout sessions. Before launch, the analyst and I agreed on the success metrics so we couldn't pick flattering numbers afterward.",
          {
            bullets: [
              'Checkout completion rose from 32% to 41%.',
              'Median time from cart to order fell from 4 min 10 s to 2 min 35 s.',
              'Mobile improved the most, with completion going from 27% to 38%.',
              'Support tickets about wrong addresses or order mistakes stayed flat.',
              'About one in five guest shoppers created an account on the confirmation page.',
            ],
          },
          {
            image: {
              seed: 'wz-user-flow-optimization-results',
              w: 1600,
              h: 1000,
              alt: 'A/B test dashboard comparing completion rate and time to purchase between the old and new checkout',
            },
            caption:
              'Results after four weeks. The new flow became the default for all shoppers the following week.',
            size: 'content',
          },
          'The flat support ticket count mattered as much as the rise in conversions. It showed that cutting steps had not made the checkout less clear, which was the main worry going in.',
        ],
      },
      {
        title: 'Next Steps',
        heading: 'The next improvements will come from what happens before and after checkout.',
        content: [
          'The test answered the question we started with, but it raised a few new ones. Some shoppers still left at the delivery section, the first place they saw shipping costs, which has more to do with pricing and messaging than with the flow.',
          {
            bullets: [
              'Show estimated shipping costs on the product page and in the cart.',
              'Test saving details across devices for returning guest shoppers.',
              'Use the collapsible-section pattern in the returns flow, which has too many steps as well.',
            ],
          },
          'My biggest lesson was to go through the questions before designing screens. Most of the steps we removed were never needed, and a spreadsheet showed that faster than a new layout would have.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-feature-prioritization',
    title: 'Feature Prioritization',
    slug: 'feature-prioritization',
    year: 2025,
    featured: false,
    order: 11,
    thumbnail: {
      seed: 'wz-list-feature-prioritization',
      w: 1200,
      h: 900,
      alt: 'Feature Prioritization',
    },
    description: 'A framework for deciding what a small product team builds next.',
    client: 'Mock client — B2B SaaS team',
    discipline: 'Product Design',
    intro:
      'A small product team at a B2B SaaS company had more requests than capacity and no shared way to choose between them. I designed a lightweight prioritization framework and the internal tools that support it. The goal was to make roadmap decisions in a single weekly meeting and explain them to anyone who asked.',
    hero: {
      image: {
        seed: 'wz-feature-prioritization-hero',
        w: 2000,
        h: 1250,
        alt: 'Prioritization board open on a laptop next to printed request cards',
      },
    },
    summary:
      'A shared, evidence-based way for a six-person team to decide what to build next, and to explain why.',
    details: [
      {label: 'Role', value: 'Product Designer\nWorkshop Facilitator'},
      {label: 'Timeline', value: '10 weeks\nMar – May 2025'},
      {label: 'Team', value: '1 Product Manager\n4 Engineers\n1 Customer Success Lead'},
      {
        label: 'Skills & Tools',
        value: 'Stakeholder interviews\nCo-design workshops\nService design\nFigma & FigJam',
      },
    ],
    overview:
      'The product team had six people, one roadmap and a backlog of more than 240 open requests from sales, support and customers. Priorities were set in long weekly debates, and decisions often reversed when a large account asked for something new. I was brought in to design a process the team would actually keep using, not a scoring spreadsheet that gets dropped after a month. Over ten weeks I interviewed the team and its stakeholders, audited six months of past decisions and co-designed a framework with the product manager. The result was a structured intake form, a three-question scoring model and a shared board that shows anyone who raises a request how the trade-offs were made.',
    impact:
      'Weekly planning dropped from three hours to one, and the share of shipped work tied to a documented customer problem rose from 41% to 78% in the first quarter.',
    sections: [
      {
        title: 'Problem Statement',
        heading: 'The team had plenty of ideas but no shared way to choose between them.',
        content: [
          'Requests arrived through five channels: sales calls, support tickets, a shared inbox, customer check-ins and hallway conversations. Each one landed in the backlog with a different level of detail, and most described a proposed feature without any problem attached. By planning time, the team was comparing a one-line note from sales with a fully specced idea from engineering.',
          {
            image: {
              seed: 'wz-feature-prioritization-backlog',
              w: 2000,
              h: 1250,
              alt: 'Wall of sticky notes representing the unsorted backlog of requests',
            },
            caption:
              'The backlog at the start: 243 open items, 60% with no linked customer or problem.',
            size: 'full',
          },
          {h3: 'What this cost the team'},
          {
            bullets: [
              'Weekly planning ran close to three hours and often ended without a decision.',
              'Roadmap commitments changed an average of four times per quarter.',
              "Engineers said they often didn't know why they were building what they were building.",
              "Customer success couldn't tell customers when, or whether, a request would be addressed.",
            ],
          },
          'The product manager and I agreed on a narrow goal. The team should be able to reach a defensible decision in one meeting, and people outside that meeting should be able to see the reasoning.',
        ],
      },
      {
        title: 'Research',
        heading: 'Before designing anything, I needed to see how the team actually made decisions.',
        content: [
          'I ran one-hour interviews with all six team members and five stakeholders from sales, support and leadership. I also audited 38 roadmap decisions from the previous six months, tracing each one back to where the request came from and what happened after it shipped. That gave me two sources to compare: what people said about the process and what the record showed.',
          {
            gallery: [
              {
                seed: 'wz-feature-prioritization-interviews',
                w: 1200,
                h: 900,
                alt: 'Remote interview with a customer success lead, with handwritten notes beside the laptop',
              },
              {
                seed: 'wz-feature-prioritization-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of interview notes grouped into themes',
              },
              {
                seed: 'wz-feature-prioritization-audit',
                w: 1200,
                h: 900,
                alt: 'Spreadsheet audit of 38 past roadmap decisions, color coded by outcome',
              },
            ],
            caption: 'Interviews, synthesis and the decision audit.',
          },
          {h3: 'Key findings'},
          {
            bullets: [
              'The loudest request usually won. Items raised by sales in the last week of a quarter were three times as likely to be scheduled.',
              'Effort was estimated, but value rarely was. Only 9 of 38 decisions had any written reasoning about customer impact.',
              'People mostly agreed on the goals. They disagreed because each of them was looking at different evidence.',
              'The team had tried a framework before. A detailed scoring spreadsheet was dropped after five weeks because it took too long to fill in.',
            ],
          },
          {
            image: {
              seed: 'wz-feature-prioritization-journey',
              w: 1600,
              h: 1000,
              alt: 'Journey map of a feature request from first mention to release',
            },
            caption: "Mapping one request's path showed three points where context was lost.",
            size: 'content',
          },
          "The last finding shaped the whole project. The team didn't need a more rigorous model. It needed a lighter one that fit into the time it already spent on planning, with evidence captured when a request came in instead of pieced together during the meeting.",
        ],
      },
      {
        title: 'Design Process',
        heading:
          'I designed the framework with the team and tested each version in real planning meetings.',
        content: [
          "I didn't present a finished framework. Instead I ran three co-design workshops with the product manager, the engineers and customer success. Each workshop produced a version that we used in the next week's planning session, so we learned from real decisions.",
          {
            image: {
              seed: 'wz-feature-prioritization-workshop',
              w: 2000,
              h: 1400,
              alt: 'Team members sorting printed request cards on a table during a co-design workshop',
            },
            caption: 'Workshop two: sorting 30 real requests with a draft scoring model.',
            size: 'full',
          },
          {h3: 'Three rounds, three models'},
          'The first version used six weighted criteria and took about eight minutes per item, which was too slow for a backlog this size. The second cut it to three criteria on a 1–10 scale, but people spent more time arguing over a 6 versus a 7 than discussing the request itself. The third version used three questions with fixed answers. Scoring then took under two minutes per item, and disagreements became easier to name.',
          {
            gallery: [
              {
                seed: 'wz-feature-prioritization-sketch',
                w: 1200,
                h: 900,
                alt: 'Early paper sketches of the scoring card layout',
              },
              {
                seed: 'wz-feature-prioritization-wireframe',
                w: 1200,
                h: 900,
                alt: 'Low-fidelity wireframe of the prioritization board',
              },
            ],
            caption: 'From paper scoring cards to the first wireframe of the board.',
          },
          {
            video: SAMPLE_VIDEO,
            caption:
              'Walkthrough of the prototype from workshop three: scoring a request and watching it move on the board.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          'The final system has three parts: a structured way in, a simple score and a board anyone can read.',
        content: [
          {h3: 'Structured intake'},
          "Every request now starts with a short form. It asks what the problem is, who has it and how often it comes up, and only then asks for a solution. The form takes about two minutes and replaces the free-text notes that used to fill the backlog. When a request duplicates an existing one, the two are merged, so the count of affected accounts goes up and the backlog doesn't grow.",
          {
            gallery: [
              {
                seed: 'wz-feature-prioritization-intake',
                w: 900,
                h: 1600,
                alt: 'Mobile intake form step asking for the customer problem',
              },
              {
                seed: 'wz-feature-prioritization-duplicate',
                w: 900,
                h: 1600,
                alt: 'Duplicate detection prompt suggesting an existing matching request',
              },
              {
                seed: 'wz-feature-prioritization-confirm',
                w: 900,
                h: 1600,
                alt: 'Confirmation screen showing when the request will be reviewed',
              },
            ],
            caption:
              'The intake flow works on mobile, so sales and support can log requests right after a call.',
          },
          {h3: 'A simple score on a shared board'},
          'Each request is scored on reach, strength of evidence and effort, and each question has three fixed answers. The score orders the list, but the team still makes the call by discussing the top ten each week. I chose this on purpose. A fully automatic ranking would have been faster, but the team said they would stop trusting it the first time it got something wrong.',
          {
            image: {
              seed: 'wz-feature-prioritization-board',
              w: 2000,
              h: 1250,
              alt: 'Prioritization board with requests grouped into Now, Next and Later columns',
            },
            caption:
              'The shared board. Each card shows its score, its evidence and the reason it sits where it does.',
            size: 'full',
          },
          'Every move on the board is recorded in a decision log with a one-line reason. Customer success can pass those reasons on to customers, and the team has a record to review each quarter.',
        ],
      },
      {
        title: 'Outcome',
        heading: 'Planning got shorter, and the work that shipped was easier to explain.',
        content: [
          'I compared the first full quarter on the framework with the two quarters before it. The numbers came from meeting calendars, the issue tracker and a short survey the team filled in before and after the change.',
          {
            image: {
              seed: 'wz-feature-prioritization-metrics',
              w: 1600,
              h: 1000,
              alt: 'Dashboard comparing planning time and roadmap changes before and after the framework',
            },
            caption: 'Before and after, measured over one quarter.',
            size: 'content',
          },
          {
            bullets: [
              'Weekly planning time fell from about three hours to one.',
              'Mid-quarter roadmap changes dropped from four to one.',
              '78% of shipped work was linked to a documented customer problem, up from 41%.',
              '5 of 6 team members said they could explain why the current priorities were chosen, up from 1.',
            ],
          },
          "The biggest change doesn't show up in these numbers. Sales stopped escalating individual requests to leadership, because they could see where their requests sat and why. The product manager spent less time defending the roadmap and more time on discovery.",
        ],
      },
      {
        title: 'Next Steps',
        heading:
          'The framework works for one team, and the next test is whether it holds up as the company grows.',
        content: [
          "Two more product teams have asked to adopt the framework, which will show whether the scoring questions hold up with different products and customers. I'm writing up the process as a short playbook so it can be run without me in the room.",
          {
            bullets: [
              'Review the decision log each quarter to check whether high-scoring items delivered what we expected.',
              'Add a simple way for customers to check the status of requests they raised.',
              'Test whether reach should be weighted by account size. Sales has asked for this, and engineering has concerns about it.',
            ],
          },
          {
            image: {
              seed: 'wz-feature-prioritization-playbook',
              w: 1600,
              h: 1000,
              alt: 'Pages of the prioritization playbook laid out on a desk',
            },
            caption: 'A draft of the playbook for teams adopting the framework.',
            size: 'content',
          },
          'If I did this again, I would share the decision audit with the whole team before the first workshop. It was the most persuasive evidence I had, but at first I only walked through it with the product manager. Showing it to everyone earlier would have saved a round of debate.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-cross-platform-usability',
    title: 'Cross-Platform Usability',
    slug: 'cross-platform-usability',
    year: 2025,
    featured: false,
    order: 12,
    thumbnail: {
      seed: 'wz-list-cross-platform-usability',
      w: 1200,
      h: 900,
      alt: 'Cross-Platform Usability',
    },
    description: 'Making one product feel native on web, iOS and Android.',
    client: 'Mock client — productivity app',
    discipline: 'UI/UX',
    intro:
      "A productivity app started on the web, and its iOS and Android versions were built by wrapping that same interface. I led a usability program to find where the shared interface broke each platform's conventions. Then I redesigned the core flows so each version felt at home on its device, while the three still shared one design system.",
    hero: {
      image: {
        seed: 'wz-cross-platform-usability-hero',
        w: 2000,
        h: 1250,
        alt: 'The redesigned task list shown on a laptop, an iPhone and an Android phone',
      },
    },
    summary:
      "One product, three platforms: I rebuilt the core flows so they follow each platform's conventions without splitting the design system.",
    details: [
      {label: 'Role', value: 'Lead Product Designer\nUsability Research'},
      {label: 'Timeline', value: '7 months\nFeb – Aug 2025'},
      {
        label: 'Team',
        value:
          '1 Product Designer (me)\n1 UX Researcher\n1 Product Manager\n6 Engineers (web, iOS, Android)',
      },
      {label: 'Skills & Tools', value: 'Figma\nProtoPie\nDovetail\nMaze\nUsability testing'},
    ],
    overview:
      "The app helps small teams manage tasks, notes and shared calendars. It started as a web product, and the mobile apps came later, reusing the web components inside native shells. Mobile ratings were well below web, and support tickets kept raising the same issues: gestures that didn't work, back buttons that went to the wrong place, and menus that felt out of place on a phone. Over seven months I ran usability testing across all three platforms, decided which patterns should be shared and which should adapt, and redesigned navigation, task creation and settings for web, iOS and Android. The work shipped in two releases in mid-2025.",
    impact:
      'Task creation on mobile got 38% faster, and the Android rating rose from 3.4 to 4.3 within three months of the second release.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'The mobile apps behaved like a website squeezed onto a phone, and people noticed.',
        content: [
          "When I joined, the iOS and Android apps shared about 80% of their interface code with the web app. That made shipping fast, but it also meant a floating hamburger menu on iOS, a custom back arrow that ignored Android's system back, and hover-style menus that needed a long press to open. The Android app was rated 3.4 stars and the iOS app 3.6, while web users rated the product 4.5 out of 5 in satisfaction surveys.",
          {
            image: {
              seed: 'wz-cross-platform-usability-before',
              w: 2000,
              h: 1250,
              alt: 'Side-by-side screenshots of the original task list on web, iOS and Android, showing identical layouts',
            },
            caption:
              'The original task list used the same layout on every platform, hamburger menu included.',
            size: 'full',
          },
          {h3: 'What support tickets told us'},
          {
            bullets: [
              'Android users lost unsaved tasks after pressing the system back button',
              "iOS users couldn't swipe back from nested screens",
              'The custom web date picker was hard to use with one hand',
              'Settings sat three levels deep behind a menu few people opened',
            ],
          },
          "The product team's first instinct was to build fully separate native apps. That would have tripled the design and engineering work for every future feature, so my brief was narrower. I was asked to find where the shared approach was hurting people and fix those places without splitting the product.",
        ],
      },
      {
        title: 'Research',
        heading:
          'I tested the same tasks on every platform to separate real problems from personal preference.',
        content: [
          "With our researcher, I ran moderated sessions with 24 existing users, eight per platform, and each one completed the same five tasks on their own device. We recorded both screens and hands, so we could see when someone reached for a gesture or button that wasn't there. I also audited all three apps against Apple's Human Interface Guidelines and Material Design and listed every place we broke platform conventions.",
          {
            gallery: [
              {
                seed: 'wz-cross-platform-usability-session',
                w: 1200,
                h: 900,
                alt: 'Participant completing a task on an Android phone during a moderated usability session',
              },
              {
                seed: 'wz-cross-platform-usability-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of interview notes grouped by platform and task',
              },
              {
                seed: 'wz-cross-platform-usability-audit',
                w: 1200,
                h: 900,
                alt: 'Spreadsheet audit comparing each screen against iOS and Android conventions',
              },
            ],
            caption:
              'Moderated sessions, synthesis in Dovetail and a screen-by-screen convention audit.',
          },
          {h3: 'Key findings'},
          {
            bullets: [
              'Navigation caused 61% of observed errors, mostly around back behaviour and the hidden menu',
              "People expected their platform's gestures and got frustrated when swipe-back or pull-to-refresh did nothing",
              'Creating a task took mobile users more than twice as long as web users, mainly because of the date and assignee pickers',
              'Nobody asked for the apps to look different. They asked for them to behave the way their phone does',
            ],
          },
          {
            image: {
              seed: 'wz-cross-platform-usability-journey',
              w: 1600,
              h: 1000,
              alt: 'Journey map comparing task creation steps and error points across web, iOS and Android',
            },
            caption: 'Creating a task took 11 steps on Android and 7 on web.',
            size: 'content',
          },
          'The finding that people wanted familiar behaviour, not a different look, shaped the whole project. Brand, layout and content could stay shared. Behaviour, navigation and input controls needed to follow each platform.',
        ],
      },
      {
        title: 'Design Process',
        heading:
          'I split the design system into what stays the same and what adapts to each platform.',
        content: [
          'I sorted every component in our Figma library into three tiers: shared, adapted and native. Shared components, like task cards and tags, look and work the same everywhere. Adapted components keep their purpose and content but change their behaviour or placement on each platform. Native components are replaced entirely by the system control, as with date pickers and share sheets.',
          {
            image: {
              seed: 'wz-cross-platform-usability-tiers',
              w: 2000,
              h: 1400,
              alt: 'Component library board sorted into shared, adapted and native columns',
            },
            caption: 'Every component went into one of three tiers, with notes for engineering.',
            size: 'full',
          },
          {h3: 'Prototyping navigation on real devices'},
          'Navigation was the biggest risk, so I prototyped three concepts in ProtoPie and tested them on real phones rather than in a browser. Two followed their platform, a bottom tab bar on iOS and a navigation bar with a floating action button on Android, and the third was a hybrid bottom sheet menu shared by both. The platform versions beat both the hybrid and the existing hamburger menu. On web, a collapsible left sidebar kept the density that desktop users relied on.',
          {
            video: SAMPLE_VIDEO,
            caption:
              'Testing the Android prototype: system back, auto-saved drafts and the new create button.',
            size: 'content',
          },
          {
            gallery: [
              {
                seed: 'wz-cross-platform-usability-navios',
                w: 900,
                h: 1600,
                alt: 'iOS prototype with a bottom tab bar',
              },
              {
                seed: 'wz-cross-platform-usability-navandroid',
                w: 900,
                h: 1600,
                alt: 'Android prototype with a navigation bar and floating action button',
              },
              {
                seed: 'wz-cross-platform-usability-navhybrid',
                w: 900,
                h: 1600,
                alt: 'Rejected hybrid concept using a shared bottom sheet menu',
              },
            ],
            caption:
              'I tested three navigation concepts with 12 participants and dropped the hybrid after the first round.',
          },
          "I reviewed each round with the iOS and Android leads before moving on. They caught two gestures that would have clashed with system behaviour, so we didn't have to rework them after build.",
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          'Each platform now behaves like itself, and the product still looks like one product.',
        content: [
          {h3: 'Navigation'},
          'iOS uses a bottom tab bar, and every nested screen supports swipe-back. Android uses a navigation bar and respects system back, and it saves a draft automatically when someone backs out of a new task. Web keeps a collapsible sidebar with keyboard shortcuts for power users.',
          {
            image: {
              seed: 'wz-cross-platform-usability-final',
              w: 2000,
              h: 1250,
              alt: 'Final task list designs on web, iOS and Android shown side by side',
            },
            caption:
              'The content and visual language are the same everywhere, and navigation matches each platform.',
            size: 'full',
          },
          {h3: 'Faster task creation'},
          "On mobile, I replaced the custom date and assignee pickers with native controls and added natural-language input, so typing 'Fri 3pm' sets the due date. The long create form became a compact sheet with the most-used fields first. On web, the quick-add bar understands the same shorthand.",
          {
            gallery: [
              {
                seed: 'wz-cross-platform-usability-sheetios',
                w: 1200,
                h: 1200,
                alt: 'iOS task creation sheet with the native date picker open',
              },
              {
                seed: 'wz-cross-platform-usability-sheetandroid',
                w: 1200,
                h: 1200,
                alt: 'Android task creation sheet with the Material date picker open',
              },
            ],
            caption: "Task creation uses each platform's own pickers inside a shared layout.",
          },
          'On mobile, settings moved out of the menu into a profile tab, and on web they moved to an account page, grouped the way each platform groups its own settings. It was a small change, but it removed one of our most common support questions.',
        ],
      },
      {
        title: 'Outcome',
        heading:
          'Mobile caught up with web, and the team stopped arguing about platform differences one screen at a time.',
        content: [
          'We shipped navigation and settings in June and task creation in August. Three months after the second release, we repeated the original usability test with 18 new participants and measured task times in an unmoderated Maze study.',
          {
            bullets: [
              'Average task creation time on mobile fell from 48 to 30 seconds, 38% faster',
              'Navigation errors in testing dropped by 70%',
              'The Android rating rose from 3.4 to 4.3 and iOS from 3.6 to 4.4',
              'Support tickets about lost work fell to almost zero',
            ],
          },
          {
            image: {
              seed: 'wz-cross-platform-usability-metrics',
              w: 1600,
              h: 1000,
              alt: 'Dashboard showing app store ratings and task creation time before and after release',
            },
            caption: 'App ratings and task creation time over the six months around launch.',
            size: 'content',
          },
          'The three-tier system also changed how the team works. Each new feature now starts with a quick call on which tier each component belongs to, which has cut the back-and-forth between designers and platform engineers.',
        ],
      },
      {
        title: 'Next Steps',
        heading:
          'Tablets come next, where the line between phone and desktop patterns is less clear.',
        content: [
          "Tablet use has grown since launch, and the current iPad and Android tablet layouts are just stretched phone screens. Before deciding what should adapt, I'm planning research on how people use the app with keyboards and split screen.",
          {
            image: {
              seed: 'wz-cross-platform-usability-tablet',
              w: 1600,
              h: 1000,
              alt: 'Early sketches of a two-pane tablet layout for tasks and notes',
            },
            caption: 'Early explorations of a two-pane layout for tablets.',
            size: 'content',
          },
          {
            bullets: [
              'Run diary studies with tablet users on both platforms',
              'Apply the three-tier component model to tablet layouts on iPad and Android',
              'Add tier notes to the Figma library so the rules stay attached to the components',
            ],
          },
          "The main lesson I'm taking forward is that consistency across platforms should come from content and brand. It doesn't come from making every button behave the same way.",
        ],
      },
    ],
  },
  {
    id: 'mock-project-design-system-integration',
    title: 'Design System Integration',
    slug: 'design-system-integration',
    year: 2025,
    featured: false,
    order: 13,
    thumbnail: {
      seed: 'wz-list-design-system-integration',
      w: 1200,
      h: 900,
      alt: 'Design System Integration',
    },
    description: 'Rolling a shared component library out across three product teams.',
    client: 'Mock client — fintech company',
    discipline: 'Design Systems',
    intro:
      "A shared component library already existed, but only one of three product teams actually used it. I led the work to bring the Payments, Lending and Accounts teams onto the same system, in Figma and in code. This case study covers how we did it without pausing any team's roadmap.",
    hero: {
      image: {
        seed: 'wz-design-system-integration-hero',
        w: 2000,
        h: 1250,
        alt: 'Overview of the shared component library in Figma showing buttons, inputs, cards and tables from the unified system',
      },
    },
    summary:
      'One component library, three product teams, and a rollout plan built around how each team actually ships.',
    details: [
      {label: 'Role', value: 'Lead Product Designer\nDesign System Owner'},
      {label: 'Timeline', value: '8 months\nFeb – Sep 2025'},
      {label: 'Team', value: '2 Product Designers\n3 Front-end Engineers\n1 Product Manager'},
      {
        label: 'Skills & Tools',
        value: 'Figma Variables\nDesign Tokens\nStorybook\nComponent Audits\nWorkshop Facilitation',
      },
    ],
    overview:
      'The company had three product teams building customer-facing web and mobile apps: Payments, Lending and Accounts. A small component library had been started two years earlier, but only Payments used it, and the other two teams had forked or rebuilt most of its pieces. The result was four versions of a date picker, inconsistent form validation, and a brand color update that took 11 weeks to ship. I was asked to turn the library into something all three teams would adopt, while each team kept delivering its own roadmap. The work covered auditing what existed, restructuring tokens and components, setting up contribution and migration processes, and measuring adoption over time.',
    impact:
      'Within eight months all three teams were building on the shared library, production coverage rose from 31% to 78%, and new screens reached review about 40% faster.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'The library existed, but most of the product was built around it rather than on it.',
        content: [
          'When I picked up the project, the shared library had 46 components in Figma and 38 in code, and the two sets did not match. Payments used it daily because the library had originally been extracted from their product. Lending and Accounts had copied components into local files early on and maintained their own versions from then on, so fixes made in the library never reached them.',
          {
            image: {
              seed: 'wz-design-system-integration-audit',
              w: 2000,
              h: 1250,
              alt: 'Screenshots of button and input components from three product teams laid side by side to show inconsistencies',
            },
            caption:
              'An early audit board: one primary button, eleven variations across three products.',
            size: 'full',
          },
          {h3: 'What the fragmentation cost'},
          {
            bullets: [
              'A brand color update took 11 weeks because it had to be applied separately in three codebases.',
              'Accessibility fixes made in the library never reached Lending or Accounts, so the same contrast and focus issues came up in every audit.',
              'Designers estimated they spent about 20% of their time rebuilding components that already existed elsewhere.',
              'Customers moving between products saw different patterns for the same task, such as entering an account number.',
            ],
          },
          'The goal was not to build a new library. It was to get three teams to trust and use one, without asking them to stop product work for a rewrite.',
        ],
      },
      {
        title: 'Research',
        heading:
          'Before touching any components, I needed to understand why two teams had walked away.',
        content: [
          'I ran a component inventory across all three products and interviewed 14 designers, engineers and product managers. The inventory showed what had diverged, and the interviews explained why. I also sat in on sprint planning with each team for two weeks to see where library decisions were actually being made.',
          {
            gallery: [
              {
                seed: 'wz-design-system-integration-inventory',
                w: 1200,
                h: 900,
                alt: 'Spreadsheet inventory of UI components mapped against each product team and their local variants',
              },
              {
                seed: 'wz-design-system-integration-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of interview notes grouped into themes about trust, speed and ownership',
              },
            ],
            caption: 'Component inventory (left) and interview synthesis (right).',
          },
          {h3: 'What we heard'},
          {
            bullets: [
              'The library moved slower than product deadlines, so teams forked components to unblock themselves.',
              'Nobody outside Payments knew how to propose a change or who would review it.',
              'Components were missing states Lending relied on, such as multi-step forms with saved progress and dense data tables.',
              'Engineers did not trust that Figma matched code, so they built from screenshots and specs instead.',
            ],
          },
          {
            image: {
              seed: 'wz-design-system-integration-parity',
              w: 1600,
              h: 1000,
              alt: 'Chart comparing component parity between Figma and code, with mismatched properties highlighted',
            },
            caption:
              'Only 19 of 46 components matched between Figma and code in name, properties and states.',
            size: 'content',
          },
          'The pattern was clear: the problem was less about the components and more about ownership and speed. If adopting the library made a team slower, they would leave again. Every decision after this point was tested against that.',
        ],
      },
      {
        title: 'Design Process',
        heading: 'We rebuilt the foundations first, then moved one team at a time.',
        content: [
          'I split the work into three tracks: foundations, components and process. Foundations came first, because tokens were the cheapest way to align all three products visually before swapping a single component. We moved color, type, spacing and radius into Figma variables and a matching token file that engineering used to generate CSS and native values.',
          {
            image: {
              seed: 'wz-design-system-integration-tokens',
              w: 2000,
              h: 1400,
              alt: 'Token architecture diagram showing primitive, semantic and component token layers',
            },
            caption:
              'Three token layers: primitives, semantic roles, and a thin component layer for exceptions.',
            size: 'full',
          },
          {h3: 'Components as an API, not a picture'},
          'For each component, an engineer and I wrote the props first and then built the Figma component to match them name for name. We reviewed every component against real screens from all three teams before calling it done. This slowed down the first few components, but it removed the gap between Figma and code that had broken trust in the first place.',
          {
            gallery: [
              {
                seed: 'wz-design-system-integration-props',
                w: 1200,
                h: 1200,
                alt: 'Figma component properties panel for the text input, with names matching the code props',
              },
              {
                seed: 'wz-design-system-integration-states',
                w: 1200,
                h: 1200,
                alt: 'Grid of text input states including default, focus, error, disabled and read-only',
              },
              {
                seed: 'wz-design-system-integration-storybook',
                w: 1200,
                h: 1200,
                alt: 'Storybook page for the text input showing live controls and usage notes',
              },
            ],
            caption:
              'Text input: Figma properties, the full state matrix, and the matching Storybook entry.',
          },
          {
            video: SAMPLE_VIDEO,
            caption:
              'Walkthrough of building a component API-first: writing the props, matching them in Figma, then checking the result in Storybook.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'Two changes made using the library the easier path for every team.',
        content: [
          {h3: 'A contribution model with a five-day turnaround'},
          'Any designer could propose a new component or variant using a short template. A rotating reviewer from each team joined a weekly 30-minute review, and accepted proposals were built and released within five working days. Teams stopped forking because waiting for the library was now faster than rebuilding locally.',
          {
            gallery: [
              {
                seed: 'wz-design-system-integration-proposal',
                w: 1200,
                h: 900,
                alt: 'Contribution proposal template in Figma with sections for problem, use cases and proposed API',
              },
              {
                seed: 'wz-design-system-integration-review',
                w: 1200,
                h: 900,
                alt: 'Board tracking component proposals from submitted through review, build and released',
              },
            ],
            caption: 'The proposal template and the board we used to track every request.',
          },
          {h3: 'Migration kits for each team'},
          'Instead of one big rollout, I put together a migration kit per team: a map of their local components to library equivalents, codemods for the straightforward swaps, and a short list of gaps we would fill first. Lending needed dense tables and a stepped form, so we shipped those before asking them to migrate anything. Accounts went last, after we had refined the kit based on what slowed Lending down.',
          {
            gallery: [
              {
                seed: 'wz-design-system-integration-payments',
                w: 900,
                h: 1600,
                alt: 'Payments app transfer screen built with shared library components',
              },
              {
                seed: 'wz-design-system-integration-lending',
                w: 900,
                h: 1600,
                alt: 'Lending app loan application step built with the shared stepped form',
              },
              {
                seed: 'wz-design-system-integration-accounts',
                w: 900,
                h: 1600,
                alt: 'Accounts app onboarding screen using shared inputs, buttons and progress indicator',
              },
            ],
            caption:
              'The same inputs, buttons and form patterns across Payments, Lending and Accounts.',
          },
        ],
      },
      {
        title: 'Outcome',
        heading:
          'All three teams now ship on the same library, and it keeps improving because they contribute to it.',
        content: [
          'By September, all three products were running on the same tokens and core component set. Lending migrated in six weeks and Accounts in nine, and both contributed components back along the way. The next brand update, a change to the primary palette and button radius, shipped across all three products in two days.',
          {
            image: {
              seed: 'wz-design-system-integration-dashboard',
              w: 2000,
              h: 1250,
              alt: 'Adoption dashboard showing library component usage by product team over eight months',
            },
            caption:
              'Adoption was tracked weekly by scanning each codebase for library imports versus local components.',
            size: 'full',
          },
          {
            bullets: [
              'Library coverage in production screens rose from 31% to 78%.',
              'Figma-to-code parity went from 19 of 46 components to 55 of 58.',
              'Time from design kickoff to review-ready dropped about 40% for new screens.',
              'Repeat accessibility findings across products fell by more than half.',
              'Product teams contributed 22 new components and variants through the proposal process.',
            ],
          },
          'The numbers mattered to leadership, but the clearest signal for me was behavioral. Teams started asking the library for things instead of working around it, and the weekly review became a place where designers from different products compared notes.',
        ],
      },
      {
        title: 'Next Steps',
        heading: 'The next phase is about patterns, not more components.',
        content: [
          'With the core set stable, most of the remaining inconsistency is in how components are combined, such as confirmation flows and error recovery. I have started documenting these as patterns, with real examples from each product.',
          {
            image: {
              seed: 'wz-design-system-integration-patterns',
              w: 1600,
              h: 1000,
              alt: "Draft pattern page for confirmation flows showing do and don't examples",
            },
            caption: 'An early draft of the confirmation flow pattern.',
            size: 'content',
          },
          {
            bullets: [
              'Publish pattern guidance for confirmations, empty states and error recovery.',
              'Add usage tracking in Figma so we can retire components nobody uses.',
              'Bring internal operations tools onto the same token set.',
            ],
          },
          'The main thing I learned is that a design system gets adopted when using it is faster than not using it. Most of our gains came from process and turnaround time, not from how the components looked.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-responsive-design-principles',
    title: 'Responsive Design Principles',
    slug: 'responsive-design-principles',
    year: 2024,
    featured: false,
    order: 14,
    thumbnail: {
      seed: 'wz-list-responsive-design-principles',
      w: 1200,
      h: 900,
      alt: 'Responsive Design Principles',
    },
    description: 'Rebuilding a content-heavy site to work from phone to desktop.',
    client: 'Mock client — cultural nonprofit',
    discipline: 'UI/UX',
    intro:
      "A cultural nonprofit's website had grown to about 1,400 pages over ten years, and many of them were hard to use on a phone. I led the redesign of its layout system, navigation and content templates so the same content works on anything from a small phone to a wide desktop. The work turned out to be as much about content structure as about screens.",
    hero: {
      image: {
        seed: 'wz-responsive-design-principles-hero',
        w: 2000,
        h: 1250,
        alt: 'The redesigned exhibition page shown on a phone, a tablet and a desktop monitor',
      },
    },
    summary:
      'I rebuilt a content-heavy cultural site around a mobile-first system that works on a 320px phone and on a wide desktop.',
    details: [
      {label: 'Role', value: 'Lead UI/UX Designer'},
      {label: 'Timeline', value: '5 months\nFeb – Jul 2024'},
      {label: 'Team', value: 'Lead designer (me)\n2 front-end developers\nContent strategist'},
      {
        label: 'Skills & Tools',
        value: 'Content audit\nUsability testing\nFigma\nDesign tokens\nHTML & CSS prototyping',
      },
    ],
    overview:
      "For most people, the nonprofit's website is where they first come across its exhibitions, events and collection. It had become hard to use on the phones most visitors carry. I led design on a five-month rebuild with two front-end developers and a content strategist. We audited 1,400 pages, ranked what matters most on each type of page, and built a mobile-first system of fluid type, spacing and components. We also gave editors guardrails and device previews so the site would stay usable after launch. The finished site is easy to read and book from on a small phone and keeps the depth desktop visitors rely on.",
    impact:
      'People on phones now book events at close to the same rate as people on desktop. Editors now publish most new pages without asking a developer to fix the layout.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'The site had outgrown the desktop layout it was built on, and phone visitors were paying for it.',
        content: [
          'The nonprofit runs exhibitions, a public events program and an online archive of its collection. Its website was built in 2014 on a fixed 960px grid, and mobile support was added later as a set of overrides. Over the next ten years, editors added long exhibition essays, wide data tables, embedded PDFs and image carousels that the templates were never designed to hold. By early 2024, 64% of sessions came from phones, but most of the site still assumed a mouse and a wide screen.',
          {
            bullets: [
              'On phones, event pages put the date, price and booking button below four screens of scrolling.',
              'The main menu held 38 top-level and nested links in a hover menu that did not work on touch.',
              'Wide tables and fixed-width embeds caused sideways scrolling on almost a third of templates.',
              'Editors had no guidance on image sizes, so a single event page could load more than 4MB of images.',
            ],
          },
          {
            image: {
              seed: 'wz-responsive-design-principles-legacy',
              w: 2000,
              h: 1250,
              alt: 'The old event page shown side by side on a phone, a tablet and a desktop',
            },
            caption:
              'The old event template at three screen sizes. On every phone we tested, the booking details were below the fold.',
            size: 'full',
          },
          "The team's brief was to make the site mobile friendly. Early on, I turned that into a question we could measure: can someone on a phone find an event, understand it and book it as easily as someone on a laptop?",
        ],
      },
      {
        title: 'Research',
        heading:
          'I started with the content, because most layout failures came from content the templates were never built to hold.',
        content: [
          'Before sketching anything, I wanted to know what was on the site, who used it and where it broke. I combined a content audit, an analytics review, interviews with visitors and editors, and testing on the devices people actually carry.',
          {h3: 'Content audit and analytics'},
          'With the content strategist, I listed all 1,400 pages and sorted them into 11 content types, from event listings to archive records. Twelve months of analytics showed that event, exhibition and visit pages made up 71% of mobile traffic, while the archive was used mostly by researchers on desktop. That split showed where mobile work would pay off first, and where a simpler small-screen view would be good enough.',
          {
            gallery: [
              {
                seed: 'wz-responsive-design-principles-inventory',
                w: 1200,
                h: 900,
                alt: 'Content inventory spreadsheet grouping pages by content type',
              },
              {
                seed: 'wz-responsive-design-principles-analytics',
                w: 1200,
                h: 900,
                alt: 'Chart of sessions by device for each content type',
              },
              {
                seed: 'wz-responsive-design-principles-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map of visitor and editor interview notes on a wall',
              },
            ],
            caption:
              'The content inventory, sessions by device for each content type, and the affinity map from interview notes.',
          },
          {h3: 'Interviews and device testing'},
          "I interviewed 9 regular visitors and 5 staff editors, and ran 12 short tests in the gallery lobby on visitors' own phones. Only 5 of the 12 lobby participants could find an event and start booking it without help. Visitors used the site in short bursts, often while standing in a queue or on transit, and gave up when they had to pinch and zoom. Editors had a different problem: they spent hours working around the templates and had no way to see a page on a phone before publishing it.",
        ],
      },
      {
        title: 'Design Process',
        heading:
          'I designed from the smallest screen up, using real content instead of placeholder text.',
        content: [
          'My working rule for the project was that every template had to be designed first at 320px wide, using the longest real content we could find. If a layout worked for a 4,000-word exhibition essay or an event with six ticket types on a small phone, scaling it up was mostly a matter of giving things more room. Placeholder text hid exactly the problems we were trying to fix, so I stopped using it after the first week.',
          {h3: 'Content priority before layout'},
          'For each content type, I ran a short priority session with the content strategist and the events team. We listed every element on the page and ranked it by what a visitor needs first, and that ranking became the content order on small screens. At wider breakpoints, secondary content could move into side columns without changing that order for screen readers.',
          {
            image: {
              seed: 'wz-responsive-design-principles-priority',
              w: 1600,
              h: 1000,
              alt: 'Priority map for the event page, ranking elements from date and booking down to related events',
            },
            caption:
              'Priority map for the event template. The ranking sets the content order on small screens.',
            size: 'content',
          },
          {
            gallery: [
              {
                seed: 'wz-responsive-design-principles-wireframe',
                w: 900,
                h: 1600,
                alt: 'Low-fidelity wireframe of the event page at 320px wide',
              },
              {
                seed: 'wz-responsive-design-principles-essay',
                w: 900,
                h: 1600,
                alt: 'Wireframe of an exhibition page with collapsible essay sections',
              },
              {
                seed: 'wz-responsive-design-principles-visit',
                w: 900,
                h: 1600,
                alt: 'Wireframe of the visit page with opening hours and directions',
              },
            ],
            caption:
              'Small-screen wireframes for the event, exhibition and visit templates, built with real content.',
          },
          "I moved to coded prototypes earlier than usual, working with one of the developers to build rough HTML and CSS versions of the three main templates. Figma frames at fixed widths couldn't show what happened between breakpoints, and that was where most of the old bugs were. We tested the prototypes on eight real devices, from an older small Android phone to a 27-inch monitor.",
          {
            video: SAMPLE_VIDEO,
            caption:
              'The coded event-template prototype resizing from phone to desktop. We used it in testing and in the developer handoff.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'A small set of fluid rules replaced years of one-off mobile overrides.',
        content: [
          {h3: 'Fluid type and spacing'},
          'Instead of setting fixed sizes at each breakpoint, I defined type and spacing as fluid scales that grow smoothly between a minimum and a maximum screen width. The system has 6 text sizes and 7 spacing steps, set up as design tokens in Figma and as CSS custom properties in code. Body text never drops below a readable size on a small phone, and long exhibition essays stop at about 70 characters per line on wide screens instead of stretching across the page.',
          {
            image: {
              seed: 'wz-responsive-design-principles-typescale',
              w: 2000,
              h: 1250,
              alt: 'Fluid type and spacing scales, with each step shown at the smallest and largest screen widths',
            },
            caption: 'The fluid type and spacing scales at the smallest and largest screen widths.',
            size: 'full',
          },
          {h3: 'Navigation and event pages built for touch'},
          'Using the analytics and a card sort with 18 participants, I cut the main menu from 38 links to 6 sections. I replaced the hover menu with a full-screen panel that works the same way with touch, mouse or keyboard. Event pages now open with a compact summary of date, price and booking button, and on phones and tablets the booking button stays pinned to the bottom of the screen once the summary scrolls out of view.',
          {
            gallery: [
              {
                seed: 'wz-responsive-design-principles-tablet',
                w: 1200,
                h: 900,
                alt: 'Event page on a tablet with the summary card and the pinned booking bar',
              },
              {
                seed: 'wz-responsive-design-principles-desktop',
                w: 1200,
                h: 900,
                alt: 'Event page on desktop with the summary card in a side column',
              },
            ],
            caption:
              'The same event template on tablet and desktop. When there is room, the summary card moves to a side column.',
          },
          {
            bullets: [
              'Below 600px, tables become stacked cards, and each card repeats the column labels.',
              'Embeds and images sit in containers with a fixed aspect ratio, so nothing runs past the screen edge.',
              'Editors upload each image once, and the site serves the right size for each screen.',
              'The CMS shows phone, tablet and desktop previews before a page is published.',
            ],
          },
        ],
      },
      {
        title: 'Outcome',
        heading: 'Visitors on phones can now find and book an event on their own.',
        content: [
          "The new site launched in stages from July 2024, starting with events and exhibitions. We compared the first three months after launch with the same months a year earlier. We also ran a second round of lobby testing on visitors' phones.",
          {
            bullets: [
              'Mobile booking conversion on event pages rose from 1.1% to 2.9%, compared with 3.4% on desktop.',
              'Bounce rate on mobile event pages fell from 71% to 48%.',
              'Average event page weight fell from 4.8MB to 1.3MB.',
              'Help requests from editors about layout fell from about 20 a month to 3.',
            ],
          },
          {
            image: {
              seed: 'wz-responsive-design-principles-devices',
              w: 2000,
              h: 1400,
              alt: 'The redesigned homepage and event pages on a row of phones, tablets and laptops',
            },
            caption: 'The redesigned templates on the devices we used for testing.',
            size: 'full',
          },
          "The result I cared about most came from the second lobby test: 11 of 12 participants found an event and started booking it on their own phone without help, compared with 5 of 12 before. The drop in editors' layout requests mattered almost as much, because editors are the ones who will keep the site working after we hand it over.",
        ],
      },
      {
        title: 'Next Steps',
        heading:
          'The archive comes next, and it needs a different approach from the rest of the site.',
        content: [
          'We chose to give the collection archive a simpler small-screen view, because most of its users are researchers on desktop. Phone use is growing, though, mostly from people who see an object in the gallery and look it up on the spot. The next phase will explore a lighter mobile record view designed for that moment.',
          {
            bullets: [
              'Design a mobile record view for archive objects, starting with lookups made inside the gallery.',
              "Extend the design tokens to the nonprofit's email newsletters and printed guides.",
              'Check new pages against the component rules with the content team every quarter.',
              'Test the new navigation panel with screen reader and switch users.',
            ],
          },
          'Looking back, I would bring editors into testing earlier. Some of our first components worked well technically but were hard to fill in well, and we only found out once real pages were being moved over.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-accessibility-improvements',
    title: 'Accessibility Improvements',
    slug: 'accessibility-improvements',
    year: 2024,
    featured: false,
    order: 15,
    thumbnail: {
      seed: 'wz-list-accessibility-improvements',
      w: 1200,
      h: 900,
      alt: 'Accessibility Improvements',
    },
    description: 'An accessibility audit and fixes for a public-facing web app.',
    client: 'Mock client — municipal services portal',
    discipline: 'UI/UX',
    intro:
      "A city's online portal lets residents pay utility bills, apply for permits and report issues like broken streetlights. After complaints from residents who use screen readers, I led an accessibility audit and worked with the city's web team to fix the worst barriers. This case study covers the audit, how we prioritized, and the redesigned components we shipped.",
    hero: {
      image: {
        seed: 'wz-accessibility-improvements-hero',
        w: 2000,
        h: 1250,
        alt: 'Redesigned municipal services portal homepage shown on desktop and mobile',
      },
    },
    summary:
      "The city's online services should work for every resident, not only the ones who use a mouse.",
    details: [
      {label: 'Role', value: 'Lead UI/UX Designer\nAccessibility Auditor'},
      {label: 'Timeline', value: '14 weeks\nMarch – June 2024'},
      {
        label: 'Team',
        value: '1 designer (me)\n3 front-end engineers\n1 product manager\n1 content strategist',
      },
      {
        label: 'Skills & Tools',
        value:
          'WCAG 2.1 AA auditing\nScreen reader testing\nUsability testing\nFigma\naxe DevTools',
      },
    ],
    overview:
      'The portal had grown over eight years, with each city department adding its own forms and pages. By 2024 it served around 60,000 residents a month, but nobody had ever reviewed it for accessibility. I audited 42 key screens against WCAG 2.1 AA, tested the top tasks with residents who use assistive technology, and turned what I found into a prioritized backlog. From there I redesigned the shared form components, navigation and error handling, and wrote specs the engineering team could build once and reuse in every department.',
    impact:
      'Critical accessibility issues dropped from 118 to 9, and every participant in retesting paid a bill without help.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'Residents who rely on keyboards and screen readers were locked out of basic city services.',
        content: [
          "The project started with a handful of complaints to the city's service line. A blind resident couldn't submit a permit application because the form's date picker trapped keyboard focus. Another couldn't tell which fields had errors after a failed submission. Every complaint turned into a phone call or an in-person visit, which cost staff time and took away residents' independence.",
          "The web team knew there were problems but couldn't say how many there were, how severe they were or where to start. My job was to answer those questions, then fix the issues that mattered most within one quarter.",
          {
            image: {
              seed: 'wz-accessibility-improvements-homepage',
              w: 2000,
              h: 1250,
              alt: 'Original portal homepage with low-contrast navigation and dense lists of links',
            },
            caption:
              "The portal before the project: low-contrast text, unlabeled icons and a navigation menu that didn't work with a keyboard.",
            size: 'full',
          },
          {h3: 'Goals'},
          {
            bullets: [
              'Meet WCAG 2.1 AA on the ten most-used tasks',
              'Fix issues in shared components so each fix applies to every department',
              'Give the web team a repeatable way to catch regressions',
              'Reduce the phone and in-person requests caused by barriers in the portal',
            ],
          },
        ],
      },
      {
        title: 'Research',
        heading:
          'An audit of 42 screens and six sessions with assistive technology users showed where the real barriers were.',
        content: [
          'The audit combined automated and manual checks. Scans with axe DevTools caught the obvious issues, such as missing labels and contrast failures. I then went through each screen using only a keyboard, and with the NVDA and VoiceOver screen readers, to find what automated tools miss, like a confusing focus order and status messages that were never announced.',
          {
            image: {
              seed: 'wz-accessibility-improvements-audit',
              w: 1600,
              h: 1000,
              alt: 'Audit spreadsheet listing issues by screen, WCAG criterion and severity',
            },
            caption:
              'I logged every issue with its screen, WCAG criterion, severity rating and the component that caused it.',
            size: 'content',
          },
          'To measure the effect on residents, not just compliance, I ran six remote sessions with residents who use screen readers, screen magnifiers or switch access. Each person tried to pay a water bill, report a streetlight outage and look up recycling pickup dates. Watching one participant spend eleven minutes looking for a submit button changed how the whole team talked about priorities.',
          {
            gallery: [
              {
                seed: 'wz-accessibility-improvements-session',
                w: 1200,
                h: 900,
                alt: 'Remote usability session with a participant using a screen magnifier',
              },
              {
                seed: 'wz-accessibility-improvements-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map grouping observations from the assistive technology sessions',
              },
            ],
            caption:
              'Remote sessions with assistive technology users, and the affinity map we built from them.',
          },
          {h3: 'What we found'},
          {
            bullets: [
              '118 critical and 204 moderate issues across 42 screens',
              '71% of the critical issues came from just five shared components',
              'Only 2 of 6 participants could pay a bill without help',
              "Error messages appeared only as red text and weren't linked to their fields in code",
              'The main navigation worked only with a mouse and had no skip link',
              "Session timeouts ended forms without warning, so residents lost everything they'd entered",
            ],
          },
        ],
      },
      {
        title: 'Design Process',
        heading:
          'I ranked issues by their effect on residents, then fixed them at the component level so each fix carried across the portal.',
        content: [
          'With over 300 issues, fixing one page at a time would have taken years. I scored each issue by severity, how many residents it affected and how many screens it appeared on, then traced it back to the component that caused it. That pointed to five components to start with: the form field, date picker, alert, navigation menu and modal.',
          {
            image: {
              seed: 'wz-accessibility-improvements-matrix',
              w: 2000,
              h: 1250,
              alt: 'Prioritization matrix plotting issues by resident impact and engineering effort',
            },
            caption:
              'Plotting issues by resident impact against engineering effort gave us a clear plan for the first sprint.',
            size: 'full',
          },
          'I rebuilt each component in Figma with accessibility annotations covering focus order, accessible names, roles, states and what a screen reader should announce. Engineers said earlier handoffs had left them guessing, so I put the annotations right next to the visual spec instead of in a separate document.',
          {
            gallery: [
              {
                seed: 'wz-accessibility-improvements-annotations',
                w: 1200,
                h: 1200,
                alt: 'Figma component annotated with focus order and ARIA roles',
              },
              {
                seed: 'wz-accessibility-improvements-contrast',
                w: 1200,
                h: 1200,
                alt: 'Color contrast checks for the updated palette',
              },
              {
                seed: 'wz-accessibility-improvements-focus',
                w: 1200,
                h: 1200,
                alt: 'Visible focus ring styles for buttons, links and inputs',
              },
            ],
            caption: 'Annotated specs, contrast checks and the new focus styles.',
          },
          {
            video: SAMPLE_VIDEO,
            caption:
              'A keyboard-only walkthrough of the redesigned permit form, recorded during a design review with engineering.',
            size: 'full',
          },
          'I checked each built component with a keyboard and a screen reader before it was merged. Catching a problem at that stage took minutes. Catching it after release would have meant another round of complaints.',
        ],
      },
      {
        title: 'Design Solutions',
        heading:
          'Clearer forms, navigation that works with a keyboard and error messages everyone can find, built once and shared by every department.',
        content: [
          {h3: 'Forms and error handling'},
          'Every field now has a visible label, and hints sit above the input instead of inside it as placeholder text. When a submission fails, a summary at the top lists each error as a link to its field. Focus moves to that summary, so screen reader users hear it right away, and errors use an icon and text instead of relying on color alone.',
          {
            image: {
              seed: 'wz-accessibility-improvements-forms',
              w: 2000,
              h: 1400,
              alt: 'Redesigned permit form showing an error summary and inline field errors',
            },
            caption: 'The error summary links straight to each field that needs attention.',
            size: 'full',
          },
          {h3: 'Navigation and structure'},
          'I added a skip link, rebuilt the main menu as a disclosure menu that works with a keyboard and fixed the heading structure on every template, so screen reader users can jump between sections. I also raised the base text size to 18px and brought every text and background color pair up to a contrast ratio of at least 4.5:1.',
          {
            gallery: [
              {
                seed: 'wz-accessibility-improvements-menu',
                w: 900,
                h: 1600,
                alt: 'Mobile navigation menu with large tap targets and clear labels',
              },
              {
                seed: 'wz-accessibility-improvements-timeout',
                w: 900,
                h: 1600,
                alt: 'Session timeout warning dialog offering the option to extend the session',
              },
              {
                seed: 'wz-accessibility-improvements-payment',
                w: 900,
                h: 1600,
                alt: 'Bill payment confirmation screen with a clear status message',
              },
            ],
            caption:
              'On mobile: larger tap targets, a timeout warning that lets residents ask for more time, and a clear payment confirmation.',
          },
        ],
      },
      {
        title: 'Outcome',
        heading:
          'Critical issues fell by 92%, and every returning participant could pay a bill without help.',
        content: [
          "We shipped the updated components in three releases in May and June 2024. A follow-up audit of the same 42 screens found 9 critical issues, down from 118. Most of the remaining issues were in older PDF forms and an embedded third-party booking widget, neither of which uses the portal's templates.",
          {
            image: {
              seed: 'wz-accessibility-improvements-results',
              w: 1600,
              h: 1000,
              alt: 'Before and after chart of critical and moderate accessibility issues',
            },
            caption: 'Issue counts from the first audit compared with the follow-up audit.',
            size: 'content',
          },
          "Four of the original participants came back for retesting, and all four completed every task without help. The city also saw fewer phone calls from residents who couldn't finish forms online, though it was too early to give a firm number.",
          {
            gallery: [
              {
                seed: 'wz-accessibility-improvements-oldform',
                w: 1200,
                h: 900,
                alt: 'Original permit form with placeholder-only labels and red-only error text',
              },
              {
                seed: 'wz-accessibility-improvements-newform',
                w: 1200,
                h: 900,
                alt: 'Redesigned permit form with visible labels, hints and clear error messages',
              },
            ],
            caption: 'The permit application form before and after the redesign.',
          },
          {
            bullets: [
              'Critical issues reduced from 118 to 9',
              'Bill payment without help rose from 2 of 6 participants to 4 of 4 in retesting',
              'Five shared components now meet WCAG 2.1 AA and are used in more than 30 forms',
              "Automated accessibility checks are now part of the team's release process",
            ],
          },
        ],
      },
      {
        title: 'Next Steps',
        heading: 'Accessibility is now part of how the team ships, not a one-time cleanup.',
        content: [
          "Most of the remaining issues are in PDF forms and a third-party booking widget that the city doesn't control directly. I documented them with recommended fixes and vendor requirements, so the city can make accessibility a requirement in its next procurement.",
          {
            bullets: [
              'Turn the most-used PDF forms into accessible web forms',
              'Add accessibility acceptance criteria to every new feature ticket',
              'Run a manual keyboard and screen reader audit every quarter',
              'Recruit a standing panel of residents who use assistive technology for ongoing testing',
            ],
          },
          {
            image: {
              seed: 'wz-accessibility-improvements-guidelines',
              w: 2000,
              h: 1250,
              alt: "Accessibility guidelines page in the portal's design system documentation",
            },
            caption:
              'A new accessibility section in the design system gives future designers and engineers a place to start.',
            size: 'full',
          },
          'The biggest lesson for me was that a few shared components caused most of the barriers. Fixing them at the source was faster than fixing one page at a time. It also made accessibility easier to maintain, not just to reach.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-interactive-prototyping',
    title: 'Interactive Prototyping',
    slug: 'interactive-prototyping',
    year: 2024,
    featured: false,
    order: 16,
    thumbnail: {
      seed: 'wz-list-interactive-prototyping',
      w: 1200,
      h: 900,
      alt: 'Interactive Prototyping',
    },
    description: 'High-fidelity prototypes that answered questions before build.',
    client: 'Mock client — health tech startup',
    discipline: 'Prototyping',
    intro:
      'For a health tech startup building a home blood pressure program, I led a prototyping effort to test the riskiest parts of the product before engineering started. Over ten weeks I built and tested five rounds of high-fidelity prototypes with patients and nurses. What we learned reshaped onboarding, removed two features and gave engineering a working reference to build from, where before they had only static screens.',
    hero: {video: SAMPLE_VIDEO},
    summary:
      'Prototypes that behaved like the real product let us settle the riskiest questions before engineering wrote any production code.',
    details: [
      {label: 'Role', value: 'Lead Product Designer\nPrototyping and research'},
      {label: 'Timeline', value: '10 weeks\nSpring 2024'},
      {
        label: 'Team',
        value: '1 product designer (me)\n1 product manager\n2 engineers\n1 clinical advisor',
      },
      {
        label: 'Skills & Tools',
        value: 'Figma\nProtoPie\nFramer\nRemote usability testing\nDiary studies',
      },
    ],
    overview:
      "The startup's first release paired a Bluetooth blood pressure cuff with a patient app and a dashboard for the care team. The roadmap was ambitious and mostly untested, because every key flow existed only as static mockups. I proposed spending ten weeks prototyping before the build, focused on the few assumptions that would be expensive to get wrong. Each prototype was scoped to a single question and tested with patients in their homes and nurses at their own workstations. The result was a smaller, clearer first release and a team habit of testing risky ideas before estimating them.",
    impact:
      'First-try cuff pairing rose from 29% to 86% across test rounds, and the leaner release shipped in nine weeks, three fewer than planned.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          'The team was about to spend a quarter building flows nobody had ever seen working.',
        content: [
          'The product was a home blood pressure program for adults with hypertension: a connected cuff, a patient app for logging readings and a dashboard where nurses monitor their panel. The roadmap had been set from static mockups and stakeholder opinion, and engineering estimated twelve weeks for the first release. The riskiest parts, pairing the cuff, logging readings daily and alerting the care team, had never been put in front of a patient or a nurse.',
          "Static screens made everything look solved. They couldn't show timing, error states or how a 68-year-old would react when a device didn't connect on the first try. I made the case that a few weeks of realistic prototypes would cost far less than rebuilding the wrong thing after launch.",
          {h3: 'The questions we needed to answer'},
          {
            bullets: [
              'Can patients over 60 pair a cuff at home without calling support?',
              'Will people log a reading every day, and do reminders help or feel like nagging?',
              'How many alerts can a nurse triage in a shift before they start skimming?',
              'Should readings sync automatically, be typed in by hand, or both?',
            ],
          },
          {
            image: {
              seed: 'wz-interactive-prototyping-roadmap',
              w: 1600,
              h: 1000,
              alt: 'Original product roadmap annotated with open questions and a risk rating for each feature',
            },
            caption: 'The original roadmap, marked up with the questions no one could answer yet.',
            size: 'content',
          },
        ],
      },
      {
        title: 'Research',
        heading: 'I started by turning every assumption into a question a prototype could answer.',
        content: [
          'I ran a two-day assumption mapping workshop with the product manager, both engineers and our clinical advisor. We plotted each assumption by how much evidence we had and how much damage it would do if it turned out to be wrong. Everything in the high-risk, low-evidence corner became the prototyping backlog, and everything else went straight to the build plan.',
          {
            image: {
              seed: 'wz-interactive-prototyping-assumptions',
              w: 2000,
              h: 1250,
              alt: 'Whiteboard assumption map with sticky notes sorted along axes of risk and evidence',
            },
            caption:
              'Assumption map from the kickoff workshop. The top-right quadrant set the prototyping agenda.',
            size: 'full',
          },
          'Before building anything, I interviewed eight patients and four nurses. Patients described past devices they had given up on, usually after one confusing setup. Nurses walked me through how they handle readings today: a shared inbox, a spreadsheet and a lot of scrolling to find the few numbers that matter.',
          {
            gallery: [
              {
                seed: 'wz-interactive-prototyping-interview',
                w: 1200,
                h: 900,
                alt: 'Remote interview with a patient showing their existing blood pressure cuff to the camera',
              },
              {
                seed: 'wz-interactive-prototyping-workstation',
                w: 1200,
                h: 900,
                alt: 'Nurse workstation with a shared inbox and spreadsheet of patient readings open side by side',
              },
              {
                seed: 'wz-interactive-prototyping-affinity',
                w: 1200,
                h: 900,
                alt: 'Affinity map grouping interview notes into themes about setup, habits and alert overload',
              },
            ],
            caption:
              "Patient interviews, a nurse's current setup and the affinity map that came out of both.",
          },
          'The research narrowed the backlog to three prototypes: device pairing, daily logging with reminders, and the clinician alert view. Each had a single question attached and a clear signal for what would count as a pass.',
        ],
      },
      {
        title: 'Design Process',
        heading:
          'Each prototype answered one question and was only as detailed as that question needed.',
        content: [
          "I matched the tool and fidelity to the question. The pairing flow was built in ProtoPie because it needed real timing, simulated connection delays and failures that happened at a set rate. The logging flow was built in Figma with variables so it could show a participant's own readings and trends, and a week-long diary study tested the reminders in daily life. The clinician dashboard was built in Framer with a data set of 120 mock patients, so nurses could triage at a realistic volume.",
          {
            video: SAMPLE_VIDEO,
            caption:
              'ProtoPie pairing prototype simulating a failed connection and the recovery path patients saw.',
            size: 'full',
          },
          {h3: 'Testing in context'},
          'Patients tested at home over video, with a real cuff on the table and the prototype running on their own phone. Nurses tested at their own workstations during a quiet part of a shift. Across five rounds in eight weeks we ran 29 patient sessions and 8 nurse sessions.',
          {
            gallery: [
              {
                seed: 'wz-interactive-prototyping-pair-start',
                w: 900,
                h: 1600,
                alt: 'Phone screen showing the first pairing step with an illustration of the cuff',
              },
              {
                seed: 'wz-interactive-prototyping-pair-wait',
                w: 900,
                h: 1600,
                alt: 'Phone screen showing a searching-for-device state with a progress indicator',
              },
              {
                seed: 'wz-interactive-prototyping-pair-retry',
                w: 900,
                h: 1600,
                alt: 'Phone screen showing a friendly connection failure message with retry and manual entry options',
              },
            ],
            caption:
              'Three states from the round-one pairing prototype, including the failure state most patients hit.',
          },
          'Between rounds I kept a shared decision log. Every change to a prototype was tied to a specific observation and a session number, which made it easy for the team to see why the design moved and stopped debates from restarting.',
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'The prototypes changed the product in ways the static designs never would have.',
        content: [
          {h3: 'Pairing that expects failure'},
          "In round one, five of seven patients failed to pair on the first try, mostly because the cuff needed a long button hold that nobody noticed in the instructions. I redesigned the step around a short looping animation of the hold, a visible countdown and a manual-entry option offered after the second failed attempt. Patients who still couldn't connect could take a reading that day and try pairing again later.",
          {
            gallery: [
              {
                seed: 'wz-interactive-prototyping-hold-before',
                w: 1200,
                h: 1200,
                alt: 'Original pairing instruction screen with a single line of text and a static cuff image',
              },
              {
                seed: 'wz-interactive-prototyping-hold-after',
                w: 1200,
                h: 1200,
                alt: 'Revised pairing screen with an animated button-hold illustration and a countdown ring',
              },
            ],
            caption: 'The pairing instruction before and after round one.',
          },
          {h3: "Alerts that fit a nurse's shift"},
          'With a full panel of mock patients, nurses stopped reading individual alerts after about forty minutes and started scanning for names they recognized. We moved routine readings into a daily digest and escalated only sustained out-of-range trends in real time. In the test data set, this cut real-time alerts by roughly 70% without hiding any of the cases our clinical advisor flagged as urgent.',
          {
            image: {
              seed: 'wz-interactive-prototyping-dashboard',
              w: 2000,
              h: 1400,
              alt: 'Clinician dashboard with a daily digest list and a separate panel for escalated trends',
            },
            caption:
              'The revised clinician view, with a daily digest and escalated trends kept apart.',
            size: 'full',
          },
          "Two planned features came off the roadmap entirely. In-app chat with the care team tested well with patients, but nurses were clear they couldn't staff it, and streak badges made several patients feel talked down to. Removing both took about three weeks out of the engineering estimate.",
        ],
      },
      {
        title: 'Outcome',
        heading: 'Engineering built a smaller, better-defined release with far fewer surprises.',
        content: [
          'First-try pairing success went from 29% in round one to 86% in round five. In the diary study, participants who got the revised reminders logged a reading on 6 of 7 days on average, compared with 4 of 7 for the original version. The first release shipped in nine weeks, three fewer than the original estimate.',
          {
            image: {
              seed: 'wz-interactive-prototyping-results',
              w: 1600,
              h: 1000,
              alt: 'Line chart of first-try pairing success rate rising across five test rounds',
            },
            caption: 'First-try pairing success by test round.',
            size: 'content',
          },
          'The prototypes also served as the spec. Engineers used the ProtoPie file to check timing, transitions and error states, which cut down on back-and-forth during the build. QA used the same failure scenarios as test cases.',
          {
            gallery: [
              {
                seed: 'wz-interactive-prototyping-kitchen',
                w: 1200,
                h: 900,
                alt: 'Patient taking a reading at a kitchen table with the cuff and phone app side by side',
              },
              {
                seed: 'wz-interactive-prototyping-log',
                w: 1200,
                h: 900,
                alt: 'Shipped patient app showing a week of readings with a simple trend line',
              },
              {
                seed: 'wz-interactive-prototyping-digest',
                w: 1200,
                h: 900,
                alt: 'Nurse reviewing the daily digest on a desktop monitor at the start of a shift',
              },
            ],
            caption: 'The shipped experience for patients and the care team.',
          },
        ],
      },
      {
        title: 'Next Steps',
        heading: 'Prototyping before estimating is now part of how the team plans work.',
        content: [
          'The team adopted a simple rule: any feature with an untested high-risk assumption gets a prototype before it is estimated. That keeps prototyping focused on real uncertainty instead of becoming a step every feature has to go through.',
          {
            bullets: [
              'Prototype medication tracking with the same one-question approach',
              'Turn the device connection states into a reusable ProtoPie component kit',
              'Test the patient app with screen reader users and the largest system text sizes',
              'Run a 30-day diary study to measure reminder fatigue over a longer period',
            ],
          },
          {
            image: {
              seed: 'wz-interactive-prototyping-kit',
              w: 2000,
              h: 1250,
              alt: 'Component kit of reusable prototype states for searching, connected, failed and manual entry',
            },
            caption: 'An early version of the shared prototyping kit for connected-device flows.',
            size: 'full',
          },
          'If I did this again, I would bring an engineer into every test session from round one. The sessions they joined produced the fastest decisions, because they could see the problem firsthand and suggest what was cheap to change.',
        ],
      },
    ],
  },
  {
    id: 'mock-project-journey-mapping',
    title: 'Journey Mapping',
    slug: 'journey-mapping',
    year: 2023,
    featured: false,
    order: 17,
    thumbnail: {seed: 'wz-list-journey-mapping', w: 1200, h: 900, alt: 'Journey Mapping'},
    description: "Mapping a first-year student's journey to find where support breaks down.",
    client: 'School project',
    discipline: 'Service Design',
    intro:
      "Journey Mapping was a semester-long service design project from my third year. With a team of four, I followed first-year students through their first eight weeks of university to find where the university's support services stopped reaching them. We ended up with a shared journey map, a service blueprint, and three small service changes that we tested with students and staff.",
    hero: {
      image: {
        seed: 'wz-journey-mapping-hero',
        w: 2000,
        h: 1250,
        alt: 'Design team standing in front of a wall-sized journey map covered in sticky notes',
      },
    },
    summary:
      'First-year students have plenty of support available, but they lose track of it somewhere between orientation and their first missed deadline.',
    details: [
      {label: 'Role', value: 'Service designer\nResearch lead'},
      {label: 'Timeline', value: '12 weeks\nFall 2023'},
      {label: 'Team', value: '4 design students\n1 faculty advisor'},
      {
        label: 'Skills & Tools',
        value: 'Diary studies\nJourney mapping\nService blueprinting\nFigJam, Figma',
      },
    ],
    overview:
      'The brief was open: pick a service at the university and redesign part of it. We picked the first-year experience because almost everyone on the team had a story about getting lost in it. Over twelve weeks we ran interviews, a five-week diary study, and co-design sessions with students, advisors and residence staff. We turned the research into a journey map of the first eight weeks of term, then built a service blueprint showing what happens behind each touchpoint. From there we prototyped three changes and tested them with a small group of first-year students.',
    impact:
      'The map showed that support fell away most sharply in weeks three to five, after orientation events wind down and as the first assignments come due. Student services staff kept the map and blueprint to use when planning for the next intake.',
    sections: [
      {
        title: 'Problem Statement',
        heading:
          "The university offered plenty of support, but students couldn't find it when they needed it.",
        content: [
          "In their first week, new students get a flood of information: orientation sessions, welcome emails, a campus app, residence meetings and a stack of printed guides. By week four most of it is forgotten, and that's when the first assignments and midterms arrive. Staff described the same problem from their side. Tutoring and advising were quiet early in term and then overwhelmed around midterms.",
          {
            image: {
              seed: 'wz-journey-mapping-orientation',
              w: 1600,
              h: 1000,
              alt: 'Orientation welcome packets, printed campus guides and flyers spread across a desk',
            },
            caption:
              'Everything a first-year student received in week one, collected from three residences.',
            size: 'content',
          },
          {h3: 'Framing the question'},
          "Our starting question, 'How might we improve the first-year experience?', was too broad to act on. After some early conversations we narrowed it to: how might we help first-year students reach the right support before a small problem turns into a crisis? That gave us a fixed stretch of time to study and a clear moment to design for.",
          {
            bullets: [
              'Focus on the first eight weeks of the fall term',
              'Include academic, wellbeing and practical support, not just one office',
              'Design for students living both on and off campus',
              'Work within existing staff and budget, with no new app',
            ],
          },
        ],
      },
      {
        title: 'Research',
        heading: 'We followed students week by week instead of asking them to remember.',
        content: [
          'Our first few interviews gave us tidy stories that students had already smoothed over in memory. To get closer to what the first weeks actually felt like, we ran a five-week diary study with 14 first-year students, from week two to week six of term. We also held 11 semi-structured interviews with students and 6 with staff from advising, residence life and the tutoring centre.',
          {
            gallery: [
              {
                seed: 'wz-journey-mapping-prompt',
                w: 900,
                h: 1600,
                alt: "Diary study prompt received as a text message on a student's phone",
              },
              {
                seed: 'wz-journey-mapping-reply',
                w: 900,
                h: 1600,
                alt: "A student's diary reply describing a stressful week of deadlines",
              },
              {
                seed: 'wz-journey-mapping-mood',
                w: 900,
                h: 1600,
                alt: 'Weekly mood check-in question with a five-point scale on a phone screen',
              },
            ],
            caption:
              'We sent daily diary prompts by text message, and each one took less than two minutes to answer.',
          },
          {
            image: {
              seed: 'wz-journey-mapping-affinity',
              w: 2000,
              h: 1250,
              alt: 'Affinity map of interview notes and diary entries clustered on a studio wall',
            },
            caption:
              'About 600 notes from the diaries and interviews, clustered over two afternoons.',
            size: 'full',
          },
          {h3: 'What we heard'},
          {
            bullets: [
              'Students knew support services existed but not which one matched their problem.',
              'Asking for help felt like admitting failure, especially before the first grade came back.',
              'Off-campus students missed most of the informal support that happened in residence.',
              'Staff usually met students only once a problem was urgent, often around midterms.',
            ],
          },
          'One pattern stood out. Students rarely described one bad moment. They described a slow slide, where a missed lecture led to a late assignment and then to avoiding their advisor altogether.',
        ],
      },
      {
        title: 'Design Process',
        heading:
          'The journey map became a shared tool for students and staff, not just a deliverable.',
        content: [
          "We built the first version of the map from the diary data, plotting each student's weekly mood check-in against the week of term. With all 14 lines laid over each other, the dip in weeks three to five was obvious. We filled in weeks one, seven and eight from the interviews, then added touchpoints, channels and the support available at each stage.",
          {
            image: {
              seed: 'wz-journey-mapping-map',
              w: 2000,
              h: 1400,
              alt: 'Printed journey map covering the first eight weeks of term, with an emotion curve, touchpoints and support channels',
            },
            caption: 'The full journey map, printed three metres wide for the workshop sessions.',
            size: 'full',
          },
          {h3: 'Co-design workshops'},
          'We took the printed map into two workshops, one with students and one with staff. Participants put sticky notes wherever the map felt wrong or incomplete. Staff were surprised by how late students first heard about some services. In the staff workshop we also drafted a service blueprint, and it showed three offices sending overlapping emails in the same week.',
          {
            gallery: [
              {
                seed: 'wz-journey-mapping-workshop',
                w: 1200,
                h: 900,
                alt: 'Students adding sticky notes to the journey map during a co-design workshop',
              },
              {
                seed: 'wz-journey-mapping-blueprint',
                w: 1200,
                h: 900,
                alt: 'Service blueprint showing frontstage touchpoints and backstage staff processes',
              },
            ],
            caption:
              'Left: the student workshop. Right: the service blueprint we drafted with staff.',
          },
          {
            video: SAMPLE_VIDEO,
            caption:
              'Time-lapse of the student workshop, where participants rebuilt the week-three section of the map.',
            size: 'full',
          },
        ],
      },
      {
        title: 'Design Solutions',
        heading: 'Three small changes, each timed to a point where students were likely to drift.',
        content: [
          "We didn't propose one big intervention. We proposed three changes that fit inside the existing services. Each one targeted a point on the map where support was available but wasn't reaching students.",
          {h3: 'Week-four check-in'},
          "In week four, before midterms, every student has a short scheduled conversation with a peer mentor. Because everyone does it, it doesn't carry the stigma of asking for help. Mentors get a simple script for pointing students to the right office.",
          {h3: 'Support guide and weekly digest'},
          "The second change is a one-page guide organized by problem instead of by office, so a student starts from 'I missed an assignment' rather than from a department name. The third is a single weekly email that replaces the separate messages from advising, residence life and tutoring. Both came straight out of the blueprint, which showed how much duplicated work was happening behind the scenes.",
          {
            gallery: [
              {
                seed: 'wz-journey-mapping-script',
                w: 1200,
                h: 1200,
                alt: 'Peer mentor conversation card with prompts for the week-four check-in',
              },
              {
                seed: 'wz-journey-mapping-directory',
                w: 1200,
                h: 1200,
                alt: 'One-page support guide organized by problem rather than by office',
              },
              {
                seed: 'wz-journey-mapping-digest',
                w: 1200,
                h: 1200,
                alt: 'Combined weekly email digest replacing separate messages from three offices',
              },
            ],
            caption:
              'Prototypes of the three changes: the mentor conversation card, the one-page support guide and the combined weekly digest.',
          },
          {
            image: {
              seed: 'wz-journey-mapping-testing',
              w: 1600,
              h: 1000,
              alt: 'A first-year student working through scenario tasks with the one-page support guide',
            },
            caption:
              'Testing the support guide with first-year students in the last weeks of term.',
            size: 'content',
          },
        ],
      },
      {
        title: 'Outcome',
        heading:
          'Students found the right service faster, and staff saw the same picture students did.',
        content: [
          'We tested the one-page support guide with 8 first-year students using scenario tasks, such as finding help after missing an assignment. On the existing website, students took about four minutes on average and often chose the wrong office. With the guide, most of them found the right place in under a minute. We also showed them a week of separate emails next to the combined digest, and seven of the eight said they would be more likely to read the digest.',
          {
            image: {
              seed: 'wz-journey-mapping-presentation',
              w: 2000,
              h: 1250,
              alt: 'Team presenting the journey map and service blueprint to student services staff',
            },
            caption:
              'Presenting the map and blueprint to student services staff at the end of term.',
            size: 'full',
          },
          'By the time the check-in prototype was ready, week four had long passed, so we ran it as a role-play with peer mentors. They liked having a script, but they asked for clearer guidance on when to escalate. Student services staff kept the printed map and asked for the blueprint to use when planning for the next intake.',
        ],
      },
      {
        title: 'Next Steps',
        heading: 'A journey map only stays useful if someone keeps it up to date.',
        content: [
          {
            bullets: [
              'Repeat the diary study with the next intake to check whether the week-three dip holds',
              'Pilot the week-four check-in in two residences and one off-campus mentoring group',
              'Give student services an editable version of the map to update each term',
            ],
          },
          {h3: 'What I learned'},
          "This was my first project where the main output wasn't a screen. I learned that the conversation a journey map starts is worth more than the map itself. Putting students and staff in front of the same artifact did more than any presentation could.",
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Expansion into Sanity document shape

export const mockImageUrl = ({seed, w = 1600, h = 1200}: MockImage) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

// Placeholder for an image that still needs uploading. The seed script swaps
// it for a real asset reference; the dev fallback resolves it to its URL.
export type MockAsset = {_mock: {url: string; width: number; height: number}}

const mockAsset = (img: MockImage): MockAsset => ({
  _mock: {url: mockImageUrl(img), width: img.w ?? 1600, height: img.h ?? 1200},
})

type KeyGen = () => string

const span = (text: string, key: KeyGen) => ({_type: 'span', _key: key(), text, marks: []})

function expandBlock(block: MockBlock, key: KeyGen): Record<string, unknown>[] {
  if (typeof block === 'string') {
    return [
      {_type: 'block', _key: key(), style: 'normal', markDefs: [], children: [span(block, key)]},
    ]
  }
  if ('h3' in block) {
    return [
      {_type: 'block', _key: key(), style: 'h3', markDefs: [], children: [span(block.h3, key)]},
    ]
  }
  if ('bullets' in block) {
    return block.bullets.map((text) => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      markDefs: [],
      children: [span(text, key)],
    }))
  }
  if ('image' in block) {
    return [
      {
        _type: 'mediaImage',
        _key: key(),
        asset: mockAsset(block.image),
        alt: block.image.alt ?? '',
        caption: block.caption,
        size: block.size ?? 'full',
      },
    ]
  }
  if ('video' in block) {
    return [
      {
        _type: 'mediaVideo',
        _key: key(),
        url: block.video,
        caption: block.caption,
        size: block.size ?? 'full',
        autoplay: block.autoplay ?? true,
      },
    ]
  }
  return [
    {
      _type: 'mediaGallery',
      _key: key(),
      caption: block.caption,
      images: block.gallery.map((img) => ({
        _type: 'image',
        _key: key(),
        asset: mockAsset(img),
        alt: img.alt ?? '',
      })),
    },
  ]
}

// Returns the mock projects as Sanity documents. Image fields hold `_mock`
// placeholders in place of asset references.
export function buildMockProjects() {
  let n = 0
  const key: KeyGen = () => `k${(n++).toString(36)}`

  return MOCK_PROJECTS.map((p) => ({
    _id: p.id,
    _type: 'project',
    title: p.title,
    slug: {_type: 'slug', current: p.slug},
    year: p.year,
    featured: p.featured,
    order: p.order,
    coverImage: {_type: 'image', asset: mockAsset(p.thumbnail), alt: p.thumbnail.alt ?? p.title},
    description: p.description,
    client: p.client,
    discipline: p.discipline,
    link: p.link,
    intro: p.intro,
    hero: p.hero
      ? [
          'image' in p.hero
            ? {
                _type: 'mediaImage',
                _key: key(),
                asset: mockAsset(p.hero.image),
                alt: p.hero.image.alt ?? '',
                size: 'full',
              }
            : {_type: 'mediaVideo', _key: key(), url: p.hero.video, autoplay: true, size: 'full'},
        ]
      : undefined,
    summary: p.summary,
    details: p.details?.map((d) => ({_type: 'detailItem', _key: key(), ...d})),
    overview: p.overview,
    impact: p.impact,
    showSideMenu: p.showSideMenu ?? true,
    sections: p.sections?.map((s) => ({
      _type: 'projectSection',
      _key: key(),
      title: s.title,
      heading: s.heading,
      content: s.content.flatMap((b) => expandBlock(b, key)),
    })),
  }))
}
