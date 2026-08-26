export const DEFAULT_ATS_LATEX_RESUME = `\\documentclass[a4paper,10pt]{article}

\\usepackage[margin=0.55in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}

\\hypersetup{
    colorlinks=true,
    urlcolor=black
}

\\setlist[itemize]{
    leftmargin=*,
    noitemsep,
    topsep=1pt
}

\\titleformat{\\section}
    {\\large\\bfseries}
    {}
    {0em}
    {}
    [\\titlerule]

\\begin{document}

% ============================================================
% HEADER
% ============================================================

\\begin{center}
    {\\Large \\textbf{ADITYA KUMAR SAH}} \\\\[3pt]
    B.Tech -- Computer Science and Engineering \\\\[2pt]
    Bhagalpur College of Engineering, Bihar \\\\[3pt]
    \\href{mailto:your.email@gmail.com}{your.email@gmail.com}
    ~|~ +91 XXXXX XXXXX
    ~|~ Bhagalpur, Bihar \\\\[2pt]
    \\href{https://github.com/yourusername}{GitHub}
    ~|~
    \\href{https://linkedin.com/in/yourusername}{LinkedIn}
    ~|~
    \\href{https://leetcode.com/yourusername}{LeetCode}
\\end{center}

% ============================================================
% OBJECTIVE
% ============================================================

\\section{Objective}

Computer Science undergraduate passionate about full-stack development,
competitive programming, and building scalable software products.
Strong foundation in data structures, web development, databases, and
modern JavaScript technologies. Seeking opportunities to apply technical
skills through internships, software projects, and collaborative development.

% ============================================================
% EDUCATION
% ============================================================

\\section{Education}

\\textbf{Bhagalpur College of Engineering, Bihar}
\\hfill \\textit{2024 -- 2028} \\\\
B.Tech in Computer Science and Engineering
\\hfill \\textbf{CGPA: 8.63/10}

\\vspace{2pt}

\\textbf{Higher Secondary Education}
\\hfill \\textit{2024} \\\\
Science Stream
\\hfill \\textbf{Percentage: XX\\%}

% ============================================================
% TECHNICAL SKILLS
% ============================================================

\\section{Technical Skills}

\\begin{itemize}
    \\item \\textbf{Languages:} C, C++, Java, JavaScript, TypeScript, Python, HTML, CSS
    \\item \\textbf{Frontend:} React.js, Next.js, Tailwind CSS, React Native
    \\item \\textbf{Backend:} Node.js, Express.js, REST APIs
    \\item \\textbf{Database:} MongoDB, PostgreSQL, Supabase, Prisma
    \\item \\textbf{Tools:} Git, GitHub, VS Code, Postman, Docker
    \\item \\textbf{Deployment:} Vercel, Netlify, GitHub
\\end{itemize}

% ============================================================
% PROJECTS
% ============================================================

\\section{Projects}

\\textbf{BEU Predictor -- College Admission Predictor}
\\hfill \\textit{Next.js, React, Data Processing}
\\begin{itemize}
    \\item Developed a web application that helps students predict suitable
    engineering colleges based on their BEU/UGEAC rank.
    \\item Processed previous-year college cutoff data and created an
    interactive prediction interface for students.
    \\item Deployed the production application using Vercel and optimized
    the interface for mobile users.
\\end{itemize}

\\textbf{SmartLearn -- Gamified Learning Platform}
\\hfill \\textit{Next.js, React, PostgreSQL, Supabase}
\\begin{itemize}
    \\item Designed an EdTech platform combining structured courses,
    coding practice, gamification, leaderboards, and student progress tracking.
    \\item Implemented coding battles supporting individual and team-based
    participation with real-time competitive features.
    \\item Added course-specific discussions, polls, doubt solving, achievements,
    and coding profile integrations.
\\end{itemize}

\\textbf{CodeArena -- Competitive Programming Platform}
\\hfill \\textit{Next.js, TypeScript, Monaco Editor}
\\begin{itemize}
    \\item Built an online coding environment with Monaco Editor and
    competitive programming features.
    \\item Integrated coding profiles and problem-solving workflows for
    platforms such as Codeforces and LeetCode.
\\end{itemize}

% ============================================================
% EXPERIENCE
% ============================================================

\\section{Experience}

\\textbf{Flutter Developer Intern -- Aleefaraba Pvt. Ltd.}
\\hfill \\textit{Internship}
\\begin{itemize}
    \\item Developed responsive mobile application features using Flutter
    and Dart while following reusable component-based architecture.
    \\item Collaborated with developers to debug application issues and
    improve overall user experience.
\\end{itemize}

% ============================================================
% ACHIEVEMENTS
% ============================================================

\\section{Achievements}

\\begin{itemize}
    \\item Participated in national-level hackathons including Smart India
    Hackathon and Hack4Bihar.
    \\item Competitive programmer with experience solving problems involving
    Data Structures and Algorithms.
    \\item Participated in IIT Bhubaneswar tech fest Robo Soccer competition.
\\end{itemize}

% ============================================================
% PROFILES
% ============================================================

\\section{Profiles}

\\begin{itemize}
    \\item \\textbf{GitHub:} \\href{https://github.com/yourusername}{github.com/yourusername}
    \\item \\textbf{LinkedIn:} \\href{https://linkedin.com/in/yourusername}{linkedin.com/in/yourusername}
    \\item \\textbf{CodeChef:} \\href{https://www.codechef.com/users/yourusername}{codechef.com/users/yourusername}
    \\item \\textbf{LeetCode:} \\href{https://leetcode.com/yourusername}{leetcode.com/yourusername}
\\end{itemize}

\\end{document}
`;
