import { Customer } from "../../src/domain/entities/types";

export const extractBuildingName = (address: string) => {
  if (!address) return "같은 주소 고객";
  const parenMatch = address.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const parts = parenMatch[1].split(",");
    const possibleName = parts[parts.length - 1].trim();
    if (
      !possibleName.endsWith("동") &&
      !possibleName.endsWith("읍") &&
      !possibleName.endsWith("면")
    )
      return possibleName;
  }
  const words = address.split(" ");
  const lastWord = words[words.length - 1];
  if (/(아파트|빌딩|빌라|타워|상가|센터|오피스텔|맨션|원룸)$/.test(lastWord))
    return lastWord;
  if (words.length >= 2)
    return `${words[words.length - 2]} ${words[words.length - 1]}`
      .replace(/\(.*?\)/g, "")
      .trim();
  return address;
};

export const getShortModelName = (model: string) =>
  model ? model.split(".")[0] : "";

export const getShortServiceType = (type: string) => {
  if (!type) return "";
  if (type.includes("라이트 플러스")) return "라플";
  if (type.includes("라이트")) return "라";
  if (type.includes("기본")) return "기";
  return type.substring(0, 2);
};

export const getTagsHTML = (c: Customer) => {
  const shortModel = getShortModelName(c.model_name || "");
  const serviceBadge = c.service_type
    ? `<span class="tag-badge service-tag">${c.service_type}</span>`
    : "";
  const modelBadge = shortModel
    ? `<span class="tag-badge model-tag">${shortModel}</span>`
    : "";
  if (!modelBadge && !serviceBadge) return "";
  return `<div class="tags-container">${serviceBadge}${modelBadge}</div>`;
};

export const getLabelHTML = (c: Customer) => {
  const shortService = getShortServiceType(c.service_type || "");
  const shortModel = getShortModelName(c.model_name || "");
  let tags = "";
  if (shortService || shortModel) {
    const sBadge = shortService
      ? `<span class="map-label-tag service">${shortService}</span>`
      : "";
    const mBadge = shortModel
      ? `<span class="map-label-tag model">${shortModel}</span>`
      : "";
    tags = `<div style="display:flex; gap:1.5px; margin-bottom:1px; pointer-events:none;">${sBadge}${mBadge}</div>`;
  }
  return `
    <div style="display:flex; flex-direction:column; align-items:center; gap:0px; pointer-events:none; transform: translateY(-4px);">
      ${tags}
      <span class="marker-label" style="pointer-events:none; margin-top:-1px;">${c.name}</span>
    </div>
  `;
};

export const getMajorityStatus = (group: Customer[]) => {
  let uncontacted = 0,
    contact = 0;

  group.forEach((c) => {
    if (c.status === "컨택") contact++;
    else if (c.status !== "완료") uncontacted++; // 미컨택이거나 값이 없으면
  });

  // 1순위: 단 한 명이라도 미컨택이 있으면 무조건 빨강!
  if (uncontacted > 0) return "미컨택";
  // 2순위: 미컨택은 없지만, 컨택 중인 곳이 하나라도 있으면 노랑!
  if (contact > 0) return "컨택";
  // 3순위: 전부 다 완료되었을 때만 파랑!
  return "완료";
};

export const formatVisitTime = (visitTimeStr: string | null | undefined): string => {
  if (!visitTimeStr) return "지정 안 됨";
  
  // Format: "YYYY-MM-DD HH:mm"
  const parts = visitTimeStr.split(" ");
  const datePart = parts[0];
  const timePart = parts[1] || "";
  
  const datePieces = datePart.split("-");
  if (datePieces.length !== 3) return visitTimeStr;
  
  const year = datePieces[0];
  const month = parseInt(datePieces[1], 10);
  const date = parseInt(datePieces[2], 10);
  
  const dateObj = new Date(parseInt(year, 10), month - 1, date);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = days[dateObj.getDay()];
  
  const formattedDate = `${year}년 ${month}월 ${date}일(${dayName})`;
  return timePart ? `${formattedDate} ${timePart}` : formattedDate;
};

export const generateSingleHTML = (customer: Customer, groupId: string) => {
  const phoneLink = customer.phone ? customer.phone : "";
  const isNoneChecked = customer.status === "미컨택" ? "checked" : "";
  const isContactChecked = customer.status === "컨택" ? "checked" : "";
  const isDoneChecked = customer.status === "완료" ? "checked" : "";
  const statusClass =
    customer.status === "완료"
      ? "done"
      : customer.status === "컨택"
        ? "contact"
        : "none";
  
  const favoriteChar = customer.favorite ? "★" : "☆";
  const visitTimeDisplay = customer.visit_time
    ? `⏰ ${formatVisitTime(customer.visit_time)}`
    : "⏰ 미지정";

  return `
    <div class="custom-popup single-popup" onwheel="event.stopPropagation()" ontouchmove="event.stopPropagation()" onmousedown="event.stopPropagation()">
      <button class="custom-popup-close" onclick="window.closeMapPopup('${groupId}')">✕</button>
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; padding-right:20px;">
        <span style="font-weight:900; font-size:14px; color:#0f172a; max-width:110px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${customer.name}</span>
        <button onclick="window.reactToggleFavoriteFromMap(${customer.id}, ${!customer.favorite})" class="star-btn" style="border:none; background:none; cursor:pointer; color:#fbbf24; font-size:16px; padding:0; line-height:1;">${favoriteChar}</button>
        <span id="badge_${customer.id}" class="group-status-badge ${statusClass}">${customer.status || "미컨택"}</span>
      </div>
      ${getTagsHTML(customer)}
      <div style="font-size:11px; color:#64748b; line-height:1.4; margin-bottom:6px; word-break:break-all; white-space:normal;">
        ${customer.address}
      </div>
      <div onclick="window.reactEditTimeFromMap(${customer.id}, '${customer.visit_time || ""}')" style="font-size:11px; font-weight:700; color:#3b82f6; cursor:pointer; margin-bottom:12px; display:inline-block; hover:underline;">
        ${visitTimeDisplay}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="display:flex; gap:4px;">
          ${phoneLink ? `<a href="tel:${phoneLink}" class="circle-btn phone-btn" title="전화" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">📞</a>` : ""}
          <button onclick="window.handleNaviMap('tmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn tmap-btn" title="티맵">T</button>
          <button onclick="window.handleNaviMap('nmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn nmap-btn" title="네이버">N</button>
        </div>
        <div class="map-status-selector" style="margin-top:0; flex:1;">
          <input type="radio" id="status_none_${customer.id}" name="status_${customer.id}" value="미컨택" ${isNoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '미컨택', '${groupId}')">
          <label for="status_none_${customer.id}">미컨택</label>
          <input type="radio" id="status_contact_${customer.id}" name="status_${customer.id}" value="컨택" ${isContactChecked} onclick="window.changeMarkerStatus(${customer.id}, '컨택', '${groupId}')">
          <label for="status_contact_${customer.id}">컨택</label>
          <input type="radio" id="status_done_${customer.id}" name="status_${customer.id}" value="완료" ${isDoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '완료', '${groupId}')">
          <label for="status_done_${customer.id}">완료</label>
        </div>
      </div>
    </div>
  `;
};

export const generateGroupItemHTML = (customer: Customer, groupId: string) => {
  const phoneLink = customer.phone ? customer.phone : "";
  const isNoneChecked = customer.status === "미컨택" ? "checked" : "";
  const isContactChecked = customer.status === "컨택" ? "checked" : "";
  const isDoneChecked = customer.status === "완료" ? "checked" : "";
  const statusClass =
    customer.status === "완료"
      ? "done"
      : customer.status === "컨택"
        ? "contact"
        : "none";

  const favoriteChar = customer.favorite ? "★" : "☆";
  const visitTimeDisplay = customer.visit_time
    ? `⏰ ${formatVisitTime(customer.visit_time)}`
    : "⏰ 미지정";

  return `
    <div class="group-item">
      <div class="group-item-header">
        <div style="display:flex; flex-direction:column; gap:4px; max-width: 130px;" onclick="window.toggleGroupItem(${customer.id}); if(window.reactSelectCustomer) { window.reactSelectCustomer(${customer.id}); }">
          <div style="display:flex; align-items:center; gap:4px;">
            <span class="group-item-name">${customer.name}</span>
            <button onclick="event.stopPropagation(); window.reactToggleFavoriteFromMap(${customer.id}, ${!customer.favorite})" class="star-btn" style="border:none; background:none; cursor:pointer; color:#fbbf24; font-size:14px; padding:0; line-height:1;">${favoriteChar}</button>
          </div>
          ${getTagsHTML(customer)}
        </div>
        <div class="group-item-icons" onclick="window.toggleGroupItem(${customer.id}); if(window.reactSelectCustomer) { window.reactSelectCustomer(${customer.id}); }">
          <span id="badge_${customer.id}" class="group-status-badge ${statusClass}">${customer.status || "미컨택"}</span>
          <svg id="group_arrow_${customer.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      <div id="group_body_${customer.id}" style="display:none; padding-top:4px; padding-bottom:12px;">
        <div style="font-size:11px; color:#64748b; line-height:1.4; margin-bottom:6px; word-break:break-all; white-space:normal;">
          ${customer.address}
        </div>
        <div onclick="window.reactEditTimeFromMap(${customer.id}, '${customer.visit_time || ""}')" style="font-size:11px; font-weight:700; color:#3b82f6; cursor:pointer; margin-bottom:10px; display:inline-block; hover:underline;">
          ${visitTimeDisplay}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div style="display:flex; gap:4px; align-items:center;">
            ${phoneLink ? `<a href="tel:${phoneLink}" class="circle-btn phone-btn" title="전화" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; text-decoration:none; display:flex; align-items:center; justify-content:center; width:28px; height:28px; borderRadius:50%;">📞</a>` : ""}
            <button onclick="window.handleNaviMap('tmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn tmap-btn" title="티맵">T</button>
            <button onclick="window.handleNaviMap('nmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn nmap-btn" title="네이버">N</button>
          </div>
          <div class="map-status-selector" style="margin-top:0; flex:1;">
            <input type="radio" id="status_none_${customer.id}" name="status_${customer.id}" value="미컨택" ${isNoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '미컨택', '${groupId}')">
            <label for="status_none_${customer.id}">미컨택</label>
            <input type="radio" id="status_contact_${customer.id}" name="status_${customer.id}" value="컨택" ${isContactChecked} onclick="window.changeMarkerStatus(${customer.id}, '컨택', '${groupId}')">
            <label for="status_contact_${customer.id}">컨택</label>
            <input type="radio" id="status_done_${customer.id}" name="status_${customer.id}" value="완료" ${isDoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '완료', '${groupId}')">
            <label for="status_done_${customer.id}">완료</label>
          </div>
        </div>
      </div>
    </div>
  `;
};
