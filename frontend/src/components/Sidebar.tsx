'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  HomeIcon,
  UserGroupIcon,
  DocumentArrowUpIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CpuChipIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon },
  { name: 'Customer Upload', href: '/upload', icon: DocumentArrowUpIcon },
  { name: 'Campaigns', href: '/campaigns', icon: ChatBubbleLeftRightIcon },
  { name: 'Conversations', href: '/conversations', icon: ChatBubbleOvalLeftEllipsisIcon },
  { name: 'Google Reviews', href: '/reviews', icon: StarIcon },
  { name: 'AI Configuration', href: '/ai', icon: CpuChipIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
]

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon },
]

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={clsx(
        'relative z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-4">
              <button
                type="button"
                className="-m-2 p-2"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-4 overflow-y-auto bg-gradient-to-b from-white to-purple-50 px-5 pb-3">
              <div className="flex h-16 shrink-0 items-center justify-center">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl px-3 py-1 shadow-lg">
                  <span className="text-xl font-bold text-white">ReviewReap</span>
                </div>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-6">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={clsx(
                                isActive
                                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border-purple-500'
                                  : 'text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-600 border-transparent hover:shadow-md',
                                'group flex gap-x-3 rounded-xl p-3 text-sm font-semibold border-2 transition-all duration-300 transform hover:scale-105'
                              )}
                            >
                              <item.icon
                                className={clsx(
                                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                                  'h-5 w-5 shrink-0 transition-colors duration-300'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                  <li>
                    <div className="text-xs font-semibold leading-6 text-gray-400">Secondary</div>
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {secondaryNavigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={clsx(
                              pathname === item.href
                                ? 'bg-purple-50 text-purple-600'
                                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                          >
                            <item.icon
                              className={clsx(
                                pathname === item.href ? 'text-purple-600' : 'text-gray-400 group-hover:text-purple-600',
                                'h-6 w-6 shrink-0'
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="-mx-6 mt-auto">
                    <div className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-900">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">
                          {user?.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="sr-only">Your profile</span>
                      <span aria-hidden="true" className="truncate">{user?.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-x-3 px-6 py-3 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowRightOnRectangleIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col">
        <div className="flex grow flex-col gap-y-4 overflow-y-auto bg-gradient-to-b from-white to-purple-50 border-r border-purple-100 px-5 shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-center">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl px-3 py-1 shadow-lg">
              <span className="text-xl font-bold text-white">ReviewReap</span>
            </div>
          </div>
          <nav className="flex flex-1 flex-col px-3">
            <ul role="list" className="flex flex-1 flex-col gap-y-6">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={clsx(
                            isActive
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border-purple-500'
                              : 'text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-600 border-transparent hover:shadow-md',
                            'group flex gap-x-3 rounded-xl p-3 text-sm font-semibold border-2 transition-all duration-300 transform hover:scale-105'
                          )}
                        >
                          <item.icon
                            className={clsx(
                              isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                              'h-5 w-5 shrink-0 transition-colors duration-300'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 mb-3 px-2 uppercase tracking-wider">
                  Settings
                </div>
                <ul role="list" className="-mx-2 space-y-1">
                  {secondaryNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={clsx(
                            isActive
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border-purple-500'
                              : 'text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-600 border-transparent hover:shadow-md',
                            'group flex gap-x-3 rounded-xl p-3 text-sm font-semibold border-2 transition-all duration-300 transform hover:scale-105'
                          )}
                        >
                          <item.icon
                            className={clsx(
                              isActive ? 'text-white' : 'text-gray-400 group-hover:text-white',
                              'h-5 w-5 shrink-0 transition-colors duration-300'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 mb-3 border border-purple-200 shadow-md">
                  <div className="flex items-center gap-x-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-sm">
                      <span className="text-xs font-bold text-white">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="sr-only">Your profile</span>
                      <p className="text-xs font-semibold text-gray-900 truncate">{user?.email}</p>
                      <p className="text-xs text-gray-600">Account Active</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-x-1 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-white bg-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-lg border border-gray-200 hover:border-red-500 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                    <ArrowRightOnRectangleIcon className="h-3 w-3" aria-hidden="true" />
                    Logout
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Dashboard</div>
      </div>
    </>
  )
}