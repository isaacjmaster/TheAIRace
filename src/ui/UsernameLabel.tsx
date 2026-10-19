import React from 'react';
export function UsernameLabel({username}:{username:string|null}){
 return <strong className="username-label" title={username??'Founder'}>{username&&<span className="username-hash" aria-hidden="true">#</span>}<span className="username-text">{username??'Founder'}</span></strong>;
}
