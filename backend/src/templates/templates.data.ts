export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  category: 'work' | 'personal' | 'engineering' | 'writing';
  tags: string[];
  title: string;
  content: Record<string, unknown>;
}

// This is just a small functionality to provide prebuild starter template of particular types of notes
export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description:
      'Agenda, discussion points, and action items for a team meeting.',
    category: 'work',
    tags: ['meeting'],
    title: 'Meeting Notes',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Meeting Notes' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' },
            { type: 'text', text: '' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' },
            { type: 'text', text: '' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Agenda' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Discussion item 1' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Discussion' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Notes and insights' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Action Items' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Action item 1' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Action item 2' }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    description:
      "A simple daily reflection template gratitude, wins, and tomorrow's focus.",
    category: 'personal',
    tags: ['journal'],
    title: 'Journal',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Today' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Grateful for' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Three things I am grateful for...' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Wins today' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Key win or accomplishment...' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: "What I'll focus on tomorrow" }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Top priority for tomorrow...' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Goals, milestones, and risks for a new project.',
    category: 'work',
    tags: ['project', 'planning'],
    title: 'Project Plan',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Project Plan' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Goal' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Define the core problem and desired outcome.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Milestones' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Phase 1: Discovery & Specification',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Phase 2: Implementation & Testing' },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Phase 3: Rollout & Feedback' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Risks & Mitigations' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Key risk and fallback plan...' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Structured template for filing a reproducible bug.',
    category: 'engineering',
    tags: ['bug'],
    title: 'Bug',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Bug Report' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Summary: ' },
            { type: 'text', text: 'Brief description of the bug.' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Steps to Reproduce' }],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Navigate to ...' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Click on ...' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Observe behavior ...' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Expected Behavior' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'What should have happened.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Actual Behavior' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'What actually occurred.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Environment' }],
        },
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'Browser/OS/Version info' }],
        },
      ],
    },
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Reflect on the past week and set priorities for the next.',
    category: 'personal',
    tags: ['review'],
    title: 'Weekly Review',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Weekly Review' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'What went well' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Successes and positive moments' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'What could improve' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Bottlenecks and areas to adjust' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Top priorities for next week' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Priority 1' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Priority 2' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Priority 3' }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'blog-draft',
    name: 'Blog Post Draft',
    description:
      'A skeleton for drafting a blog posthook, body, and call to action.',
    category: 'writing',
    tags: ['writing', 'draft'],
    title: 'Draft',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Article Title' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              marks: [{ type: 'italic' }],
              text: 'One-line hook that pulls the reader in.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Context and core question/thesis.' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Body' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Key points and supporting arguments.' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Conclusion / Call to action' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Wrap-up and reader takeaway.' }],
        },
      ],
    },
  },
  {
    id: 'code-snippet',
    name: 'Code Snippet',
    description: 'Save a reusable code snippet with context and usage notes.',
    category: 'engineering',
    tags: ['snippet'],
    title: 'Snippet',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Snippet Title' }],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [
            {
              type: 'text',
              text: '// paste your snippet here\nexport function example() {\n  return true;\n}',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Usage notes: ' },
            { type: 'text', text: 'How and where to use this snippet.' },
          ],
        },
      ],
    },
  },
  {
    id: 'book-notes',
    name: 'Book Notes',
    description:
      "Capture key takeaways and quotes from something you're reading.",
    category: 'personal',
    tags: ['reading'],
    title: 'Book Notes',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Book Notes' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Title: ' },
            { type: 'text', text: 'Book Title' },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', marks: [{ type: 'bold' }], text: 'Author: ' },
            { type: 'text', text: 'Author Name' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Key Takeaways' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Core concept 1' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Core concept 2' }],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Favorite Quotes' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Memorable quote from the book.' },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Rating & Recommendation' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '★★★★★ - Notes on who should read this.' },
          ],
        },
      ],
    },
  },
];
