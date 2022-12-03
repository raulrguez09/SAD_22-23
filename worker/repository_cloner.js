import child_process from 'child_process';

export default (repoExists = '', username = '', repo = '', branch = 'master') => {
  if (!repoExists) {
    child_process.execSync(`git clone https://${username}:${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${username}/${repo}.git ${username}/${repo}`);
  }
}