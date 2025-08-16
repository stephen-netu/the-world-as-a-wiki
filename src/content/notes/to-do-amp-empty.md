---
title: "To-do &amp; Empty"
description: ""
date: "2020-05-29"
links: ["daily-notes"]
draft: false
---

## [Daily Notes](/notes/daily-notes/)

__**To-do**__
<$list filter="[tag[To-do]!sort[created]]">
<br><$link><$transclude field="title"/></$link>
</$list>

<br>
__**Drafts**__
<$list filter="[has[draft.of]!sort[created]]">
<br><$link><$transclude field="title"/></$link>
</$list>


<br>
__**Empty**__
<$list filter="[!is[system]!has[text]!has[_canonical_uri]!sort[created]]">
<br><$link><$transclude field="title"/></$link>
</$list>

<br>
__**Missing**__
[ $:/core/ui/MoreSideBar/Missing ](/notes/coreuimoresidebarmissing/)
