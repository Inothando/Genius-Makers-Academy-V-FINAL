import sys
import re

content = open("src/pages/PastPapersPage.tsx").read()

# Make outer container smaller
content = content.replace(
    '''<div className="bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-[2rem] p-3 md:p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] flex flex-col gap-4 relative overflow-hidden backdrop-blur-[40px] backdrop-saturate-[1.8] sticky top-24 z-50 transition-all duration-300">''',
    '''<div className="bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 rounded-2xl p-2 md:p-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] flex flex-col gap-2 relative overflow-hidden backdrop-blur-[40px] backdrop-saturate-[1.8] sticky top-24 z-50 transition-all duration-300">'''
)

# Top row gap and padding
content = content.replace(
    '''<div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 ${showFilters ? 'pb-4 border-b border-white/10 dark:border-white/5' : ''}`}>''',
    '''<div className={`flex flex-col md:flex-row md:items-center justify-between gap-2 relative z-10 ${showFilters ? 'pb-2 border-b border-white/10 dark:border-white/5' : ''}`}>'''
)

# Left group gap
content = content.replace(
    '''<div className="flex-1 flex flex-col sm:flex-row gap-3 sm:items-center">''',
    '''<div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center">'''
)

# Filters toggle button
content = content.replace(
    '''className="flex items-center justify-center sm:justify-start gap-2 text-lux-text bg-lux-surface/40 hover:bg-lux-surface/60 backdrop-blur-md px-4 py-2 sm:px-4 sm:py-2.5 rounded-2xl cursor-pointer transition-all shadow-sm border border-white/20 dark:border-white/10 shrink-0"''',
    '''className="flex items-center justify-center sm:justify-start gap-1.5 text-lux-text bg-lux-surface/40 hover:bg-lux-surface/60 backdrop-blur-md px-3 py-1.5 sm:px-3 sm:py-2 rounded-xl cursor-pointer transition-all shadow-sm border border-white/20 dark:border-white/10 shrink-0"'''
)

# Search input
content = content.replace(
    '''className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lux-text/60 group-focus-within:text-lux-green-500 transition-colors" size={15} />''',
    '''className="absolute left-2.5 top-1/2 -translate-y-1/2 text-lux-text/60 group-focus-within:text-lux-green-500 transition-colors" size={14} />'''
)
content = content.replace(
    '''className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 focus:ring-1 focus:ring-lux-green-500/30 rounded-2xl py-2.5 pl-10 pr-4 text-[11px] uppercase tracking-widest font-bold outline-none transition-all placeholder:text-lux-text/50 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium text-lux-text shadow-inner"''',
    '''className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 focus:ring-1 focus:ring-lux-green-500/30 rounded-xl py-1.5 pl-8 pr-3 text-[10px] uppercase tracking-widest font-bold outline-none transition-all placeholder:text-lux-text/50 placeholder:normal-case placeholder:tracking-normal placeholder:font-medium text-lux-text shadow-inner"'''
)

# Reset button
content = content.replace(
    '''className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-2xl text-[10px] font-bold text-red-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm backdrop-blur-md"''',
    '''className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl text-[10px] font-bold text-red-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm backdrop-blur-md"'''
)

# Dropdown container
content = content.replace(
    '''<div className="animate-in slide-in-from-top-4 fade-in duration-300 flex flex-col gap-4 relative z-10">''',
    '''<div className="animate-in slide-in-from-top-2 fade-in duration-300 flex flex-col gap-2 relative z-10">'''
)
content = content.replace(
    '''<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">''',
    '''<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">'''
)

# Select inputs
content = content.replace(
    '''className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-xl py-2.5 pl-9 pr-8 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"''',
    '''className="w-full bg-lux-surface/40 backdrop-blur-md border border-white/20 dark:border-white/10 focus:border-lux-green-500 focus:bg-lux-surface/60 rounded-lg py-1.5 pl-7 pr-6 text-[10px] uppercase font-bold tracking-widest text-lux-text outline-none cursor-pointer appearance-none transition-all shadow-inner"'''
)
content = content.replace(
    '''absolute left-3 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={13}''',
    '''absolute left-2 top-1/2 -translate-y-1/2 text-lux-text/60 pointer-events-none" size={12}'''
)
content = content.replace(
    '''absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[10px]''',
    '''absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-lux-text/50 text-[9px]'''
)

# Category area gap and padding
content = content.replace(
    '''<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pt-4 border-t border-white/10 dark:border-white/5">''',
    '''<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 pt-2 border-t border-white/10 dark:border-white/5">'''
)

# Category buttons
content = content.replace(
    '''className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer leading-none ${''',
    '''className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer leading-none ${'''
)

open("src/pages/PastPapersPage.tsx", "w").write(content)

