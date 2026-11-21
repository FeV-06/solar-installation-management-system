import { useEffect, useRef, type Ref, type RefObject } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, User, X } from 'lucide-react';
import { addScroller } from '../lib/motion';
import { Icon } from './Icon';
import { Wordmark } from './Wordmark';
import { useCustomerAuth } from '../lib/customerAuth';

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/questions', 'Questions'],
  ['/about', 'About'],
] as const;

type Props = { logoRef: Ref<SVGSVGElement>; mainRef: RefObject<HTMLElement | null> };

export function Header({ logoRef, mainRef }: Props) {
  const headerRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const { customer, logout } = useCustomerAuth();

  useEffect(() => addScroller(() => {
    const header = headerRef.current;
    if (!header) return;
    header.classList.toggle('is-pill', scrollY > 40);
    const under = document.elementsFromPoint(innerWidth / 2, 36)
      .find(el => el.closest('[data-theme]') && !el.closest('.site-header'))
      ?.closest<HTMLElement>('[data-theme]');
    if (under?.dataset.theme) header.dataset.theme = under.dataset.theme;
  }), []);

  useEffect(() => { if (sheetRef.current?.open) sheetRef.current.close(); }, [pathname]);

  const closeOnLink = (e: React.MouseEvent) => { if ((e.target as Element).closest('a')) sheetRef.current?.close(); };

  return (
    <>
      <a className="btn btn-primary btn-sm skip" href="#main" onClick={e => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
      <header className="site-header" data-theme="night" ref={headerRef}>
        <div className="hdr">
          <Link className="logo" to="/" aria-label="Sol Energy, home"><Wordmark ref={logoRef} /></Link>
          <nav className="label" aria-label="Main">
            {NAV.map(([to, name]) => <NavLink key={to} to={to} end>{name}</NavLink>)}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {customer ? (
              <>
                <Link className="btn btn-primary btn-sm" to="/quote">Get a quote</Link>
                <Link className="btn btn-quiet btn-sm" to="/portal" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Icon icon={User} />
                  <span>Dashboard</span>
                </Link>
              </>
            ) : (
              <Link className="btn btn-primary btn-sm" to="/signin">Sign In</Link>
            )}
          </div>

          <button className="btn btn-quiet btn-icon menu-btn" type="button" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => sheetRef.current?.showModal()}>
            <Icon icon={Menu} />
          </button>
        </div>
      </header>
      <dialog className="sheet" data-theme="night" aria-label="Menu" ref={sheetRef} onClick={closeOnLink}>
        <div className="top-row">
          <Link className="logo" to="/">Sol<i className="dot" /></Link>
          <button className="btn btn-quiet btn-icon" type="button" aria-label="Close the menu" onClick={() => sheetRef.current?.close()}><Icon icon={X} /></button>
        </div>
        <nav aria-label="Main">
          <NavLink to="/" end>Home</NavLink>
          {NAV.map(([to, name]) => <NavLink key={to} to={to} end>{name}</NavLink>)}
          {customer ? (
            <>
              <NavLink to="/quote" end>Get a quote</NavLink>
              <NavLink to="/portal" end>Dashboard</NavLink>
              <button type="button" className="btn btn-quiet" style={{ textAlign: 'left', padding: '12px 0' }} onClick={() => logout()}>
                Sign Out
              </button>
            </>
          ) : (
            <NavLink to="/signin" end>Sign In</NavLink>
          )}
        </nav>
      </dialog>
    </>
  );
}
