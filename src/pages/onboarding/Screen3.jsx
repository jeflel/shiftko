import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROLES = [
  { value: 'nurse', label: 'Nurse', description: 'I view and claim shifts' },
  { value: 'coordinator', label: 'Coordinator', description: 'I post and manage shifts' },
]

function NurseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.99996 16.7392H7.1752C7.45882 16.7392 7.74069 16.7729 8.01563 16.8404L10.314 17.3989C10.8127 17.5204 11.3323 17.5323 11.8362 17.4344L14.3775 16.9399C15.0487 16.8092 15.6663 16.4878 16.1502 16.0169L17.9482 14.2679C18.4616 13.7694 18.4616 12.9602 17.9482 12.4608C17.486 12.0111 16.7539 11.9604 16.2309 12.3418L14.1355 13.8706C13.8354 14.0899 13.4702 14.208 13.0947 14.208H11.0712H12.3592C13.0851 14.208 13.6732 13.6359 13.6732 12.9298V12.6742C13.6732 12.0878 13.263 11.5765 12.6784 11.4348L10.6905 10.9514C10.367 10.8729 10.0356 10.8332 9.70254 10.8332C8.89854 10.8332 7.4432 11.4989 7.4432 11.4989L4.99996 12.5206M1.66663 12.1665V16.9999C1.66663 17.4666 1.66663 17.6999 1.75745 17.8782C1.83735 18.035 1.96483 18.1624 2.12163 18.2424C2.29989 18.3332 2.53325 18.3332 2.99996 18.3332H3.66663C4.13333 18.3332 4.36669 18.3332 4.54495 18.2424C4.70175 18.1625 4.82923 18.035 4.90913 17.8782C4.99996 17.6999 4.99996 17.4666 4.99996 16.9999V12.1665C4.99996 11.6999 4.99996 11.4664 4.90913 11.2882C4.82923 11.1314 4.70175 11.0039 4.54495 10.924C4.36669 10.8332 4.13333 10.8332 3.66663 10.8332H2.99996C2.53325 10.8332 2.29989 10.8332 2.12163 10.924C1.96483 11.0039 1.83735 11.1314 1.75745 11.2882C1.66663 11.4664 1.66663 11.6999 1.66663 12.1665ZM14.3261 2.99342C13.8288 1.9527 12.6821 1.40136 11.567 1.93352C10.4519 2.46568 9.97679 3.72769 10.4437 4.83556C10.7322 5.52026 11.5589 6.84988 12.1484 7.76573C12.3661 8.10413 12.475 8.27333 12.6341 8.37228C12.7705 8.45719 12.9414 8.50294 13.102 8.49769C13.2892 8.49144 13.4681 8.39936 13.8259 8.21523C14.7943 7.7168 16.175 6.97867 16.7673 6.52998C17.7255 5.80398 17.963 4.46952 17.2455 3.45508C16.528 2.44063 15.2772 2.34081 14.3261 2.99342Z"
        stroke="#3A798B"
        strokeWidth="1.67"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CoordinatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.3334 3.33329C14.1084 3.33329 14.4959 3.33329 14.8138 3.41848C15.6765 3.64964 16.3504 4.32352 16.5815 5.18624C16.6667 5.50416 16.6667 5.89165 16.6667 6.66663V14.3333C16.6667 15.7335 16.6667 16.4335 16.3942 16.9683C16.1545 17.4387 15.7721 17.8211 15.3017 18.0608C14.7669 18.3333 14.0669 18.3333 12.6667 18.3333H7.33337C5.93324 18.3333 5.23317 18.3333 4.6984 18.0608C4.22799 17.8211 3.84554 17.4387 3.60586 16.9683C3.33337 16.4335 3.33337 15.7335 3.33337 14.3333V6.66663C3.33337 5.89165 3.33337 5.50416 3.41856 5.18624C3.64972 4.32352 4.3236 3.64964 5.18632 3.41848C5.50424 3.33329 5.89173 3.33329 6.66671 3.33329M10 14.1666V9.16663M7.50004 11.6666H12.5M8.00004 4.99996H12C12.4668 4.99996 12.7001 4.99996 12.8784 4.90913C13.0352 4.82923 13.1626 4.70175 13.2425 4.54495C13.3334 4.36669 13.3334 4.13333 13.3334 3.66663V2.99996C13.3334 2.53325 13.3334 2.29989 13.2425 2.12163C13.1626 1.96483 13.0352 1.83735 12.8784 1.75745C12.7001 1.66663 12.4668 1.66663 12 1.66663H8.00004C7.53333 1.66663 7.29997 1.66663 7.12172 1.75745C6.96492 1.83735 6.83743 1.96483 6.75753 2.12163C6.66671 2.29989 6.66671 2.53325 6.66671 2.99996V3.66663C6.66671 4.13333 6.66671 4.36669 6.75753 4.54495C6.83743 4.70175 6.96492 4.82923 7.12172 4.90913C7.29997 4.99996 7.53333 4.99996 8.00004 4.99996Z"
        stroke="#A4A4A4"
        strokeWidth="1.67"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Screen3({ firstName = '', onContinue }) {
  const [role, setRole] = useState('nurse')

  function handleSubmit(event) {
    event.preventDefault()
    onContinue(role)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[90px] pb-11">
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.6px] text-[#003342]">
        What's your role{firstName ? `, ${firstName}` : ''}?
      </h1>
      <p className="mt-4 text-[17px] tracking-[-0.34px] text-[#004458]">
        Pick the one that best describes you at work.
      </p>

      <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="mt-[42px] flex flex-col gap-2.5">
          {ROLES.map((option) => {
            const selected = role === option.value
            const isCoordinator = option.value === 'coordinator'
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`flex h-[94px] w-full items-center justify-between rounded-[20px] border bg-white px-6 text-left transition-colors ${
                  selected
                    ? 'border-[#003342] shadow-[0px_7px_20px_2px_rgba(46,73,92,0.06)]'
                    : 'border-[#e3e3e3]'
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <span
                    className={`flex size-[46px] shrink-0 items-center justify-center rounded-full ${
                      isCoordinator ? 'bg-[#F2F2F2]' : 'bg-[#DAF4F9]'
                    }`}
                  >
                    {isCoordinator ? <CoordinatorIcon /> : <NurseIcon />}
                  </span>
                  <span>
                    <span
                      className={`block text-[17px] font-semibold ${
                        isCoordinator ? 'text-[#ADADAD]' : selected ? 'text-[#003342]' : 'text-[#3a798b]'
                      }`}
                    >
                      {option.label}
                    </span>
                    <span
                      className={`mt-1.5 block text-[15px] tracking-[0.15px] ${
                        isCoordinator ? 'text-[#ADADAD]' : selected ? 'text-[#004458]' : 'text-[#3a798b]'
                      }`}
                    >
                      {option.description}
                    </span>
                  </span>
                </span>

                <span
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${
                    selected ? 'bg-[#32A8CA]' : 'border border-[#e3e3e3]'
                  }`}
                >
                  {selected && <Check size={14} strokeWidth={2} className="text-white" />}
                </span>
              </button>
            )
          })}
        </div>

        <Button
          type="submit"
          className="mt-auto h-[54px] w-full rounded-[20px] bg-[#003342] text-[17px] font-semibold tracking-[-0.34px] text-[#e9faff] hover:bg-[#003342]/90"
        >
          Continue
        </Button>
      </form>
    </main>
  )
}
