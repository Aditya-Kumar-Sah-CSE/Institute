const fs = require('fs');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the course-hero block
  const heroStart = content.indexOf('      <div className="course-hero glass-card">');
  // It ends where the next div starts (course-interactions-row)
  const heroEnd = content.indexOf('      <div className="course-interactions-row" style={{ display: \'block\' }}>');
  
  const heroBlock = content.slice(heroStart, heroEnd);
  
  // Cut it out
  content = content.slice(0, heroStart) + content.slice(heroEnd);
  
  // Find where to insert it: right before joined-students
  const insertPoint = content.indexOf('      <div id="joined-students" className="enrolled-students-section"');
  
  content = content.slice(0, insertPoint) + heroBlock + content.slice(insertPoint);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Processed', filePath);
}

processFile('d:/Institute/BCE/src/app/(dashboard)/courses/[courseId]/page.tsx');
processFile('d:/Institute/institute1/src/app/(dashboard)/courses/[courseId]/page.tsx');
