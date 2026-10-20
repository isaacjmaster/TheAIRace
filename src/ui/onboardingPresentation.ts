import {builderLesson,type AvaProgress} from '../../shared/ava';
/** One policy for every HQ HUD element; completed/legacy accounts retain their full interface. */
export function onboardingHud(p:AvaProgress|null,concealed=false){
 const guided=p?.status==='active';
 const full=!concealed&&!guided;
 // The starter-builder lesson introduces Build before the resource explanations.
 // Keep that introduction visible through the following steps.
 const buildIntroduced=!!p&&(p.step>=7||p.step>=5&&p.builderStep!==undefined);
 return {previewCompany:!concealed&&guided&&p!.step<3,company:full||!concealed&&!!p&&p.step>=3,compute:full||!concealed&&!!p&&p.step>=5&&!builderLesson(p),research:full||!concealed&&!!p&&p.step>=6,build:full||!concealed&&buildIntroduced,builders:full||!concealed&&buildIntroduced,full};
}
