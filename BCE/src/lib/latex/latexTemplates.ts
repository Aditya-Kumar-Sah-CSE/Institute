export interface LatexTemplate {
  id: string;
  name: string;
  category: 'math' | 'physics' | 'chemistry' | 'exam' | 'resume';
  description: string;
  tags: string[];
  code: string;
}

export const LATEX_TEMPLATES: LatexTemplate[] = [
  {
    id: 'calculus-integrals',
    name: 'Calculus & Multivariable Integrals',
    category: 'math',
    description: 'Comprehensive calculus formulas, limits, definite integrals, and partial derivatives.',
    tags: ['calculus', 'integrals', 'derivatives', 'math'],
    code: `\\documentclass{article}
\\usepackage{amsmath, amssymb}

\\title{Advanced Calculus \\& Integration Notes}
\\author{SkillArena Academic Hub}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Fundamental Theorem of Calculus}
If $f$ is continuous on $[a, b]$ and $F$ is an antiderivative of $f$, then:
\\begin{equation}
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
\\end{equation}

\\section{Multivariable Double Integral}
The volume under the surface $z = f(x, y)$ over region $R$:
\\begin{equation}
\\iint_{R} f(x, y) \\, dA = \\int_{a}^{b} \\int_{g_1(x)}^{g_2(x)} f(x, y) \\, dy \\, dx
\\end{equation}

\\section{Taylor Series Expansion}
\\begin{equation}
f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!} (x - a)^n
\\end{equation}

\\end{document}`
  },
  {
    id: 'linear-algebra-matrices',
    name: 'Linear Algebra & System of Equations',
    category: 'math',
    description: 'Matrix representations, determinants, eigenvalues, and linear system solvers.',
    tags: ['matrices', 'linear algebra', 'eigenvalues', 'vectors'],
    code: `\\documentclass{article}
\\usepackage{amsmath, amssymb}

\\title{Linear Algebra \\& Matrix Operations}
\\author{SkillArena Math Dept}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{System of Linear Equations}
A system $A \\mathbf{x} = \\mathbf{b}$ can be written in matrix form:
\\begin{equation}
\\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
\\begin{pmatrix}
x_1 \\\\
x_2 \\\\
x_3
\\end{pmatrix}
=
\\begin{pmatrix}
b_1 \\\\
b_2 \\\\
b_3
\\end{pmatrix}
\\end{equation}

\\section{Eigenvalue Characteristic Equation}
\\begin{equation}
\\det(A - \\lambda I) = 0
\\end{equation}

\\section{Symmetric Matrix Property}
A matrix $A$ is symmetric if $A^T = A$, meaning $a_{ij} = a_{ji}$ for all $i, j$.

\\end{document}`
  },
  {
    id: 'quantum-mechanics',
    name: 'Quantum Mechanics & Wave Equations',
    category: 'physics',
    description: 'Time-dependent Schrödinger equation, Dirac notation, and wave function postulates.',
    tags: ['physics', 'quantum', 'schrodinger', 'wavefunction'],
    code: `\\documentclass{article}
\\usepackage{amsmath, amssymb, physics}

\\title{Quantum Mechanics Foundations}
\\author{Physics Research Group}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Time-Dependent Schrödinger Equation}
The core governing equation of quantum mechanics is:
\\begin{equation}
i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)
\\end{equation}
where the Hamiltonian operator $\\hat{H}$ is given by:
\\begin{equation}
\\hat{H} = -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}, t)
\\end{equation}

\\section{Bra-Ket Operator Expectation Value}
The expectation value of an observable $\\hat{A}$ for state $|\\psi\\rangle$:
\\begin{equation}
\\langle A \\rangle = \\langle \\psi | \\hat{A} | \\psi \\rangle = \\int_{-\\infty}^{\\infty} \\psi^*(x) \\hat{A} \\psi(x) \\, dx
\\end{equation}

\\section{Heisenberg Uncertainty Principle}
\\begin{equation}
\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}
\\end{equation}

\\end{document}`
  },
  {
    id: 'chemistry-thermodynamics',
    name: 'Chemical Kinetics & Equilibrium',
    category: 'chemistry',
    description: 'Nernst equation, Gibbs free energy, and chemical reaction rates.',
    tags: ['chemistry', 'thermodynamics', 'nernst', 'reactions'],
    code: `\\documentclass{article}
\\usepackage{amsmath, amssymb, mhchem}

\\title{Chemical Thermodynamics \\& Kinetics}
\\author{Department of Chemical Sciences}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Gibbs Free Energy Equation}
The relation between enthalpy, entropy, and free energy:
\\begin{equation}
\\Delta G^\\circ = \\Delta H^\\circ - T \\Delta S^\\circ = -RT \\ln K_{eq}
\\end{equation}

\\section{Nernst Electrochemistry Equation}
Cell potential calculation at arbitrary concentration:
\\begin{equation}
E = E^\\circ - \\frac{RT}{nF} \\ln Q = E^\\circ - \\frac{0.0591}{n} \\log_{10} Q
\\end{equation}

\\section{Chemical Equilibrium Balance}
\\begin{equation}
aA + bB \\rightleftharpoons cC + dD, \\quad K_c = \\frac{[C]^c [D]^d}{[A]^a [B]^b}
\\end{equation}

\\end{document}`
  },
  {
    id: 'exam-paper-template',
    name: 'Final Exam Question Paper',
    category: 'exam',
    description: 'Structured question paper with multiple choice questions, numericals, and scoring breakdown.',
    tags: ['exam', 'test', 'worksheet', 'questions'],
    code: `\\documentclass{article}
\\usepackage{amsmath, amssymb, geometry}
\\geometry{margin=1in}

\\title{Semester Final Examination: Mathematics \\& Physics}
\\author{Institution Examination Board}
\\date{Total Marks: 100 \\quad | \\quad Duration: 3 Hours}

\\begin{document}
\\maketitle

\\noindent \\textbf{Instructions:} Answer all questions in Section A and any three from Section B.

\\section*{Section A: Multiple Choice Questions (20 Marks)}

\\begin{enumerate}
    \\item What is the derivative of $f(x) = \\ln(x^2 + 1)$ with respect to $x$?
    \\begin{enumerate}
        \\item[(A)] $\\frac{1}{x^2+1}$
        \\item[(B)] $\\frac{2x}{x^2+1}$
        \\item[(C)] $\\frac{2}{x}$
        \\item[(D)] $2x \\ln(x)$
    \\end{enumerate}
    
    \\item Evaluate the integral $\\int_0^1 x e^{x} \\, dx$:
    \\begin{enumerate}
        \\item[(A)] $1$
        \\item[(B)] $e - 1$
        \\item[(C)] $e$
        \\item[(D)] $0$
    \\end{enumerate}
\\end{enumerate}

\\section*{Section B: Analytical Problems (80 Marks)}

\\begin{enumerate}
    \\item[Q3.] Solve the differential equation $\\frac{d^2y}{dx^2} + 4y = 0$ with initial conditions $y(0) = 2$ and $y'(0) = 0$.
    \\item[Q4.] Find the eigenvalues and eigenvectors of the matrix $A = \\begin{pmatrix} 4 & 1 \\\\ 2 & 3 \\end{pmatrix}$.
\\end{enumerate}

\\end{document}`
  },
  {
    id: 'academic-cv-resume',
    name: 'Academic CV & Research Resume',
    category: 'resume',
    description: 'Clean academic curriculum vitae with publication list, education, and skills.',
    tags: ['resume', 'cv', 'academic', 'bio'],
    code: `\\documentclass{article}
\\usepackage{geometry}
\\geometry{margin=0.75in}

\\title{Curriculum Vitae}
\\author{Dr. Aditya Kumar Sah}
\\date{}

\\begin{document}
\\maketitle

\\section*{Contact Information}
\\begin{itemize}
    \\item \\textbf{Email:} research@institution.edu
    \\item \\textbf{Department:} Computer Science \\& Applied Mathematics
    \\item \\textbf{Website:} https://skillarena.edu/profile
\\end{itemize}

\\section*{Education}
\\begin{itemize}
    \\item \\textbf{Ph.D. in Computer Science}, Stanford University (2022--2026)
    \\item \\textbf{B.Tech in Computer Engineering}, Grade: First Class with Distinction (2018--2022)
\\end{itemize}

\\section*{Selected Publications}
\\begin{enumerate}
    \\item Sah, A. et al. (2025). \\textit{"Voice-Controlled Real-Time LaTeX Synthesis in Distributed Platforms"}. Journal of Educational Technology, 42(3), 115--130.
    \\item Sah, A. (2024). \\textit{"Intent Parser Optimization for Hinglish Code Assistants"}. IEEE Transactions on AI, 18(2), 45--58.
\\end{enumerate}

\\section*{Technical Skills}
\\textbf{Languages \\& Frameworks:} LaTeX, TypeScript, React, Next.js, Python, KaTeX, SQL.

\\end{document}`
  }
];
