// CORtracker FAQ Knowledge Base
export const faqData = [
  // General
  {
    keywords: ['what', 'cortracker', 'about', 'application', 'app'],
    question: 'What is CORtracker?',
    answer: 'CORtracker is a comprehensive time-tracking and workforce management application. It helps employees track their work hours and allows administrators to manage teams, projects, timesheets, and employee documents.'
  },
  {
    keywords: ['features', 'can do', 'capabilities', 'offer'],
    question: 'What features does CORtracker offer?',
    answer: 'CORtracker offers: \n• Time tracking with clock in/out\n• Timesheet management\n• Project tracking\n• Employee management\n• Document storage with PIN protection\n• Leave request management\n• Performance insights\n• Team chat (CORChat)\n• Admin dashboard with analytics'
  },

  // Login & Signup
  {
    keywords: ['login', 'sign in', 'log in', 'access'],
    question: 'How do I login?',
    answer: 'Click the "Login" button on the homepage. Enter your email and password, then click "Sign In". If you\'re an admin, you\'ll be directed to the Admin Dashboard. Employees will see the Employee Dashboard.'
  },
  {
    keywords: ['signup', 'sign up', 'register', 'create account', 'new account'],
    question: 'How do I create an account?',
    answer: 'Click "Get Started" or "Sign Up" on the homepage. Fill in your name, email, and password. For admin accounts, you\'ll need a special admin signup code. Regular employees can sign up without a code.'
  },
  {
    keywords: ['admin code', 'signup code', 'admin signup'],
    question: 'What is the admin signup code?',
    answer: 'The admin signup code is required to create an administrator account. Please contact your organization\'s IT department or existing admin to obtain the code.'
  },
  {
    keywords: ['forgot', 'password', 'reset'],
    question: 'I forgot my password',
    answer: 'Please contact your administrator to reset your password. They can help you regain access to your account.'
  },

  // Time Tracking
  {
    keywords: ['clock', 'time', 'track', 'hours', 'punch'],
    question: 'How do I track my time?',
    answer: 'From your Employee Dashboard, use the "Clock In" button to start tracking. When you\'re done, click "Clock Out". Your hours are automatically recorded in your timesheet.'
  },
  {
    keywords: ['timesheet', 'view hours', 'my hours', 'work hours'],
    question: 'How do I view my timesheet?',
    answer: 'Go to "Timesheet" in the sidebar menu. You can view your daily, weekly, and monthly hours. Filter by date range to see specific periods.'
  },
  {
    keywords: ['break', 'lunch', 'pause'],
    question: 'How do I log breaks?',
    answer: 'You can clock out for breaks and clock back in when you return. Your total work time excludes break periods automatically.'
  },

  // Projects
  {
    keywords: ['project', 'task', 'assign', 'work on'],
    question: 'How do projects work?',
    answer: 'Admins can create projects and assign employees to them. When tracking time, you can select which project you\'re working on. This helps track time spent on different tasks.'
  },

  // Documents
  {
    keywords: ['document', 'upload', 'file', 'storage'],
    question: 'How do I manage documents?',
    answer: 'Go to "Documents" in your sidebar. You can upload personal documents like ID, certificates, etc. Your documents are protected with a PIN that only you know.'
  },
  {
    keywords: ['pin', 'document pin', 'secure', 'protect'],
    question: 'What is the document PIN?',
    answer: 'The document PIN is a 4-6 digit code that protects your personal documents. You set it when first accessing the Documents section. You\'ll need to enter it each time to view your files.'
  },

  // Leave & Requests
  {
    keywords: ['leave', 'vacation', 'time off', 'pto', 'holiday'],
    question: 'How do I request leave?',
    answer: 'From your dashboard, you can submit leave requests specifying the dates and reason. Your admin will review and approve/deny the request. You\'ll see the status in your dashboard.'
  },

  // Admin Features
  {
    keywords: ['admin', 'administrator', 'manage'],
    question: 'What can admins do?',
    answer: 'Admins can:\n• View all employee timesheets\n• Approve/deny leave requests\n• Manage projects\n• Add/remove employees\n• View employee documents\n• Access performance insights\n• See company-wide analytics'
  },
  {
    keywords: ['employee', 'add employee', 'new employee', 'hire'],
    question: 'How do I add a new employee?',
    answer: 'Admins can go to "Employees" in the sidebar, then click "Add Employee". Fill in the employee details. Alternatively, new employees can self-register through the signup page.'
  },
  {
    keywords: ['performance', 'insights', 'analytics', 'reports'],
    question: 'How do I view performance insights?',
    answer: 'Admins can access "Performance Insights" from the sidebar. It shows metrics like total hours worked, attendance patterns, project progress, and team productivity analytics.'
  },

  // CORChat
  {
    keywords: ['chat', 'corchat', 'message', 'team chat', 'communicate'],
    question: 'How does CORChat work?',
    answer: 'CORChat is the built-in team messaging feature. Click the red chat button in the bottom-right corner. You can:\n• Join channels like #general and #announcements\n• Create new channels\n• Send direct messages to colleagues\n• Stay connected with your team'
  },
  {
    keywords: ['channel', 'create channel', 'group chat'],
    question: 'How do I create a chat channel?',
    answer: 'Open CORChat, click "Create Channel", enter a name and optional description, then click "Create". All employees can create and join public channels.'
  },
  {
    keywords: ['direct message', 'dm', 'private message'],
    question: 'How do I send a direct message?',
    answer: 'In CORChat, click "New Message" under Direct Messages. Search for and select the person you want to message. Start typing to begin your conversation.'
  },

  // Profile
  {
    keywords: ['profile', 'account', 'settings', 'photo', 'picture'],
    question: 'How do I update my profile?',
    answer: 'Click on your name/avatar in the top-right corner and select "Profile". You can update your name, upload a profile photo, and manage your account settings.'
  },

  // Support
  {
    keywords: ['help', 'support', 'contact', 'issue', 'problem'],
    question: 'How do I get help?',
    answer: 'For technical issues, contact your administrator. You can also use CORChat to reach out to your team. For urgent matters, use your organization\'s standard support channels.'
  },
  {
    keywords: ['bug', 'error', 'not working', 'broken'],
    question: 'I found a bug or error',
    answer: 'Please report any bugs to your administrator with details about what happened, what you were trying to do, and any error messages you saw. Screenshots are helpful!'
  },

  // Default
  {
    keywords: [],
    question: 'default',
    answer: 'I\'m not sure about that. Try asking about:\n• Time tracking\n• Timesheets\n• Projects\n• Documents\n• Leave requests\n• CORChat\n• Admin features\n\nOr type "features" to see what CORtracker offers!'
  }
];

// Function to find best matching FAQ
export const findAnswer = (userInput) => {
  const input = userInput.toLowerCase().trim();
  
  // Check for greetings
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)/.test(input)) {
    return {
      question: 'Greeting',
      answer: 'Hello! 👋 I\'m CORBot, your CORtracker assistant. How can I help you today? You can ask me about time tracking, timesheets, projects, documents, CORChat, or any other feature!'
    };
  }

  // Check for thanks
  if (/^(thanks|thank you|thx|ty|cheers)/.test(input)) {
    return {
      question: 'Thanks',
      answer: 'You\'re welcome! 😊 Is there anything else I can help you with?'
    };
  }

  // Score each FAQ based on keyword matches
  let bestMatch = null;
  let highestScore = 0;

  for (const faq of faqData) {
    if (faq.question === 'default') continue;
    
    let score = 0;
    for (const keyword of faq.keywords) {
      if (input.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer keywords = more specific = higher score
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  // Return best match or default
  if (bestMatch && highestScore > 0) {
    return bestMatch;
  }

  return faqData.find(faq => faq.question === 'default');
};
