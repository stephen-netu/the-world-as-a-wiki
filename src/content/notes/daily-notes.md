---
title: "Daily Notes"
description: ""
date: "2020-05-30"
links: ["today"]
draft: false
---

\define get-origEntry() $(entryTime)$~$(entryAction)$$(entryData)$ <br />
\define get-edittedEntry() $(trimmedEdittedEntry)$ <br />
\define get-TodoIndex() $(today)$~$(entryTime)$$(entryData)$
\define get-TodoAdd() /todo $(add)$

\define listNotTodo()
<div class="DN-entries"><<DN_ifTiddlerExists>></div>
\end

\define show-deleteButton() 
<span class="DN-entries DN-deleteButton"><$button class=<<tv-config-toolbar-class>> tooltip="Delete Entry" set=[$:/ak/plugins/DailyNotes/DN-Selection](/notes/akpluginsdailynotesdn-selection/) setTo=
```
[<Content>split<get-origEntry>join[]]
```
  >
    [$:/core/images/delete-button](/notes/coreimagesdelete-button/)
</$button></span>
\end

\define start-entryEdit()
<$action-setfield $tiddler="$:/temp/DN-editEntry/$(entryData)$"  text="$(entryTime)$~$(entryAction)$$(entryData)$" /> 
\end

\define end-entryEdit()
<$set name=edittedEntry tiddler="$:/temp/DN-editEntry/$(entryData)$">
    <$set name="trimmedEdittedEntry" value=
```
[<edittedEntry>trim[]]
```
 >                  
        <$action-setfield $tiddler=[$:/ak/plugins/DailyNotes/DN-Selection](/notes/akpluginsdailynotesdn-selection/) $field="text" $value=
```
[<Content>split<get-origEntry>join<get-edittedEntry>]
```
 />
    </$set>
</$set>
\end

\define show-editButton() 
<$vars state=<<qualify """$:/temp/DN-state/$(entryData)$""">> >
    <span class="DN-entries DN-editButton">
        <$checkbox tiddler=<<state>> field="text" checked="edit" unchecked="" uncheckactions=<<end-entryEdit>> checkactions=<<start-entryEdit>> class="DN-check-edit">[$:/core/images/edit-button](/notes/coreimagesedit-button/)</$checkbox>
    </span>
    <$reveal state=<<state>> type="match" text="edit">
        <div class="tc-popup tc-tiddler-info">
            <$edit-text tiddler="$:/temp/DN-editEntry/$(entryData)$" field="text" class="tc-edit-texteditor" tag=input  />
        </div>
    </$reveal>
</$vars>
\end

\define DN_ifTiddlerNotExists()
<$button class=<<tv-config-toolbar-class>> tooltip="Expand Entry" >
    [$:/core/images/clone-button](/notes/coreimagesclone-button/)
    <$action-createtiddler $basetitle=<<entryData>> text="""[$(today)$](/notes/today/) @ $(entryTime)$"""  />
    <$action-sendmessage $message="tm-edit-tiddler" $param=<<entryData>> />
</$button>
<<entryTime>> <<show-entryData>> <<show-editButton>> <<show-deleteButton>> <br />
\end

\define DN_ifTiddlerExists()
<$list filter="[title<entryData>] +[has[title]]"  emptyMessage=<<DN_ifTiddlerNotExists>> >
    <$button class=<<tv-config-toolbar-class>> tooltip="Zoom to Entry" >
        [$:/core/images/link](/notes/coreimageslink/)
        <$action-navigate $to=<<entryData>> />
    </$button> <<entryTime>> <<show-entryData>> <<show-editButton>> <<show-deleteButton>> <br />
</$list>
\end

\define show-entryData() 
<$list filter="[<entryAction>!is[blank]]" >
    <$checkbox tiddler="$:/ak/plugins/DailyNotes/todoStatus" index=<<get-TodoIndex>> checked="checked" unchecked="" default=""> <<entryData>> </$checkbox>
</$list>
<$list filter="[<entryAction>is[blank]]" >
    <<entryData>>
</$list>
\end

\define get-updatedText() $(currentContent)$**$(timestamp)$**~$(add)$ <br />

\define entry-notTodo()
<$action-setfield $tiddler=<<today>>  text=<<get-updatedText>> /> 
<$fieldmangler tiddler=<<today>> >
    <$action-sendmessage $message="tm-add-tag" $param="DailyNotes"  /> 
</$fieldmangler>
<$action-deletefield $tiddler="$:/temp/Append" newEntry />
<$action-setfield $tiddler="$:/ak/plugins/DailyNotes/DN-Selection" text=<<today>> />
\end

---
---

<$set name=today value=<<now YYYY-0MM-0DD>> >
    <$keyboard key="enter"> 
        <$edit-text class="dn-input input-large"  tiddler="$:/temp/Append" field="newEntry"  placeholder="What news, Wayfinder?" focus="true"/>
        <label class="dn-label">Press ⏎ to capture</label>
        <$set  name="timestamp" value=<<now "0hh:0mm">>  >
            <$set name=currentContent  tiddler=<<today>> >
                <$set name="add" value=
```
[{$:/temp/Append!!newEntry}trim[]]
```
 >
                    <$list filter="[<add>regexp[/todo(?i)]]"  variable=result emptyMessage=<<entry-notTodo>> >
                        <$vars add = 
```
[<add>split[/todo]trim[]join[ ]trim[]]
```
>
                            <$vars add=<<get-TodoAdd>> >
                                <$action-setfield $tiddler=<<today>>  text=<<get-updatedText>> /> 
                                <$fieldmangler tiddler=<<today>> >
                                    <$action-sendmessage $message="tm-add-tag" $param="DailyNotes"  /> 
                                </$fieldmangler>
                                <$action-deletefield $tiddler="$:/temp/Append" newEntry />
                                <$action-setfield $tiddler="$:/ak/plugins/DailyNotes/DN-Selection" text=<<today>> />
                            </$vars>
                        </$vars>
                    </$list>
                </$set>
            </$set>
        </$set>
    </$keyboard>    
</$set>

<$list filter="[tag[DailyNotes]!sort[title]]">

<h2><$link><$transclude field="title"/></$link></h2>

<$transclude>

</$list>
