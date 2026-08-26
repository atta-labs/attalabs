import type { LifeCycleId } from './life-cycles'

export type NounCard = { overline: string; title: string; body: string }

export type StageBlock = {
  ordinal: string
  title: string
  body: string
  who: string
  endsWhen: string
  startsWith: string
  endsWith: string
}

export type TimelineContent = {
  overline: string
  title: string
  body: string
  meta: string
  checkpoints: string[]
}

export type HandoffContent = {
  overline: string
  title: string
  body?: string
  buttonLabel: string
  direction: 'down' | 'up'
  target: LifeCycleId
}

export type LifeCycleContent = {
  heading: string
  description: string
  nouns: NounCard[]
  timeline: TimelineContent
  stages: StageBlock[]
  handoff: HandoffContent
}

export const HERO_CONTENT = {
  overline: 'three altitudes — three processes',
  title: "Vinaya's life cycle",
  words: ['Plan', 'Execute', 'Archive']
}

export const CLOSING_CONTENT = {
  overline: 'where this is going',
  title: 'Same stages. Nobody driving.',
  body: 'Today a person or a small script decides when each stage starts. Next, the engine does. Only who says go changes.',
  primary: { label: 'Read the doctrine', href: '/docs' },
  secondary: { label: 'Every hand-off, written out', href: '/docs/contracts' }
}

export const LIFECYCLE_CONTENT: Record<LifeCycleId, LifeCycleContent> = {
  milestone: {
    heading: 'A milestone’s life cycle.',
    description:
      'Created once by the architect. After that its status is read off its tranches — planned, active, complete — and never written by hand.',
    nouns: [
      {
        overline: 'always',
        title: 'The goal',
        body: "Plain prose. What you're trying to get done, written for people."
      },
      {
        overline: 'if you want it',
        title: 'A release',
        body: "The version it aims at. One named field — never guessed out of a title. Completing the milestone doesn't cut the release — that's still a hand act today."
      },
      {
        overline: 'if you want it',
        title: 'A list of tranches',
        body: 'One line per batch of work. Written before any of them exists.'
      }
    ],
    timeline: {
      overline: 'the whole thing · 10 seconds',
      title: 'One milestone, start to finish.',
      body: 'Every tranche under one goal, played once at speed. Only what a milestone can see.',
      meta: 'one milestone · N tranches · time runs left to right',
      checkpoints: ['Milestone opens', 'Tranches run', 'Milestone complete']
    },
    stages: [
      {
        ordinal: 'first',
        title: 'Plan',
        body: 'Someone decides what this is for, and which batches get it there. The one real judgement call here.',
        who: 'The Architect',
        endsWhen: 'The goal written, the tranches named',
        startsWith: 'Your idea',
        endsWith: 'A milestone'
      },
      {
        ordinal: 'then',
        title: 'Tranches run',
        body: "Each tranche runs its own loop. The milestone doesn't drive them — it waits.",
        who: 'The tranches, on their own',
        endsWhen: 'Each tranche finishing its own loop',
        startsWith: 'A named tranche',
        endsWith: 'That tranche, filed'
      },
      {
        ordinal: "and that's it",
        title: 'Close',
        body: 'Not started, in flight, finished — all read off the tranches. No field to forget.',
        who: 'No one — it just reads true',
        endsWhen: 'The last tranche archiving',
        startsWith: 'Every tranche done',
        endsWith: 'A complete milestone'
      }
    ],
    handoff: {
      overline: 'one level in',
      title: 'Each of those tranches does the same three things.',
      buttonLabel: 'Look at a tranche',
      direction: 'down',
      target: 'tranche'
    }
  },
  tranche: {
    heading: 'A tranche’s life cycle.',
    description:
      'A batch of tasks with declared dependencies. Cut by the planner, archived once every task in it has landed or been dropped.',
    nouns: [
      {
        overline: 'what goes in',
        title: 'An intent',
        body: 'Someone saying what they want, in their own words. Messy is fine.'
      },
      {
        overline: 'the unit of work',
        title: 'A task',
        body: "One issue on your forge, carrying why it's shaped that way."
      },
      {
        overline: 'the order',
        title: 'What waits on what',
        body: 'Decided at planning, not discovered at merge. Colliding tasks take turns.'
      },
      {
        overline: 'what comes out',
        title: 'A write-up',
        body: 'What finished, what got dropped, what carries over. It feeds the next plan.'
      }
    ],
    timeline: {
      overline: 'the whole thing · 10 seconds',
      title: 'One tranche, start to finish.',
      body: 'The same three stages below, played once at speed — so the shape is clear before the detail arrives.',
      meta: 'one tranche · N tasks · time runs left to right',
      checkpoints: ['Tranche opens', 'Tasks run', 'Tranche archives']
    },
    stages: [
      {
        ordinal: 'first',
        title: 'Plan',
        body: 'Someone turns an intent and a few tickets into tasks an agent can finish, then says which waits for which.',
        who: 'The Planner',
        endsWhen: 'Every task a real issue',
        startsWith: 'An intent',
        endsWith: 'Real issues, in order'
      },
      {
        ordinal: 'then',
        title: 'Tasks run',
        body: "Tasks go in parallel wherever that's safe. Nothing starts before what it waits on has landed.",
        who: 'The tasks, several at a time',
        endsWhen: 'Each task landing',
        startsWith: 'A planned task',
        endsWith: 'Merged code'
      },
      {
        ordinal: "and that's it",
        title: 'Wrap up',
        body: 'The batch closes out once, and the plan gets filed rather than deleted.',
        who: 'The Tranche Archivist',
        endsWhen: 'The last task landing or being dropped',
        startsWith: 'A finished batch',
        endsWith: 'A retro, archived'
      }
    ],
    handoff: {
      overline: 'one level in',
      title: 'Every task in it runs six stages · one round trip of its own.',
      buttonLabel: 'Look at a task',
      direction: 'down',
      target: 'task'
    }
  },
  task: {
    heading: 'A task’s life cycle.',
    description: 'Six stages, six different hands, one pull request from end to end.',
    nouns: [
      {
        overline: 'where it lives',
        title: 'The issue',
        body: 'Where it starts and finishes. It carries why the task is shaped this way.'
      },
      {
        overline: 'the instructions',
        title: 'The brief',
        body: 'Exact files, exact tests, where to stop and ask. Written right before the work.'
      },
      {
        overline: 'the work itself',
        title: 'The pull request',
        body: 'The code, with the brief that produced it sitting right there in the description.'
      },
      {
        overline: 'the answer back',
        title: 'A verdict',
        body: 'What a reviewer found, posted as a comment — and only counted if it came from someone real.'
      },
      {
        overline: 'the proof',
        title: 'A test plan',
        body: 'A short list of things to actually try. Some the agent runs, some you do.'
      },
      {
        overline: 'the paper trail',
        title: 'The record',
        body: 'What shipped, what it came from, who checked it. On the pull request, not a wiki.'
      }
    ],
    timeline: {
      overline: 'the whole thing · 10 seconds',
      title: 'One task, start to finish.',
      body: 'Six stages on one pull request, played once at speed — review and security run side by side.',
      meta: 'one task · six stages · one round trip · time runs left to right',
      checkpoints: ['Issue opens', 'Brief', 'Develop', 'Review + Security', 'Verify', 'Merge', 'Archive']
    },
    stages: [
      {
        ordinal: 'first',
        title: 'Brief',
        body: "The work order, written before any code. Once work starts it's fixed — changing it is a decision, not an edit.",
        who: 'The Brief Author',
        endsWhen: 'A brief someone new could follow',
        startsWith: 'An issue',
        endsWith: 'A brief'
      },
      {
        ordinal: 'then',
        title: 'Develop',
        body: "One branch, one pull request, small enough that reviewing it isn't a chore. The laptop's checks are the merge's checks.",
        who: 'The Developer',
        endsWhen: 'A pull request that opens clean',
        startsWith: 'A brief',
        endsWith: 'A pull request'
      },
      {
        ordinal: 'two at the same time',
        title: 'Review + Security',
        body: "Two people, one pull request, at the same time. Security sits next to review so it isn't what gets skipped near a release.",
        who: 'The Reviewer, and Security',
        endsWhen: 'Both verdicts coming back green',
        startsWith: 'A pull request',
        endsWith: 'Two verdicts'
      },
      {
        ordinal: 'then',
        title: 'Verify',
        body: "Someone actually uses the thing. Green checks can't tell you the login screen works.",
        who: 'The Developer, then a person',
        endsWhen: 'Every item on the test plan ticked',
        startsWith: 'A reviewed PR',
        endsWith: 'A run test plan'
      },
      {
        ordinal: 'not really a decision',
        title: 'Merge',
        body: 'Nobody weighs this one up. Once review and verify clear, merging is what’s left.',
        who: "No one — it's just what's next",
        endsWhen: 'Review and verify both cleared',
        startsWith: 'A cleared PR',
        endsWith: 'Merged code'
      },
      {
        ordinal: "and that's it",
        title: 'Archive',
        body: 'The issue closes on purpose, and the story of the change sits on the pull request that shipped it.',
        who: 'The Archivist',
        endsWhen: 'The record posted, the issue closed',
        startsWith: 'Merged code',
        endsWith: 'A closed issue'
      }
    ],
    handoff: {
      overline: 'the bottom',
      title: 'There’s nothing underneath a task.',
      body: 'Six stages, one merged pull request. Its tranche is waiting on the last of them.',
      buttonLabel: 'Back out to the tranche',
      direction: 'up',
      target: 'tranche'
    }
  }
}
