import {builderLesson,type AvaProgress} from '../../shared/ava';
/** One policy for every HQ HUD element. Old saves/replays retain their full interface. */
export function onboardingHud(p:AvaProgress|null,concealed=false){
 const guided=p?.opening!==undefined&&p.status==='active';
 const full=!concealed&&!guided;
 return {company:full||!concealed&&!!p&&p.step>=3,compute:full||!concealed&&!!p&&p.step>=5&&!builderLesson(p),research:full||!concealed&&!!p&&p.step>=6,build:full||!concealed&&!!p&&(p.step>=7||builderLesson(p)),builders:full||!concealed&&!!p&&(p.step>=7||builderLesson(p)),full};
}
