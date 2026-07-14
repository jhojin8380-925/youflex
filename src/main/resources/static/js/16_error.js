const params = new URLSearchParams(location.search);
const code = params.get('code') === '500' ? '500' : '404';

const config = {
  '404': { illust: '🛰️', msg: '존재하지 않거나 잘못된 주소입니다.' },
  '500': { illust: '🛠️', msg: '서버에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
};

document.getElementById('errorCode').textContent = code;
document.getElementById('errorIllust').textContent = config[code].illust;
document.getElementById('errorMsg').textContent = config[code].msg;

document.getElementById('link404').classList.toggle('current', code === '404');
document.getElementById('link500').classList.toggle('current', code === '500');
