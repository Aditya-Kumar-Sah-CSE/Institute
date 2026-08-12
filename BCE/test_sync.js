const username = 'Aditya_Kumar_Sah-28';

async function run() {
  const profileRes = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Referer': 'https://leetcode.com/',
    },
    body: JSON.stringify({
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
            }
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
          userContestRanking(username: $username) {
            rating
            attendedContestsCount
            globalRanking
          }
          recentAcSubmissionList(username: $username, limit: 10) {
            title
            titleSlug
            timestamp
            lang
          }
        }
      `,
      variables: { username },
    }),
  });

  console.log('OK:', profileRes.ok);
  console.log('StatusCode:', profileRes.status);
  const json = await profileRes.json();
  console.log('Response JSON:', JSON.stringify(json, null, 2));
}

run();
