
function filter_trans_manager(doc) {
  if (
    doc.addr_anzahlwohnungen_parcel >= 30
    && doc.renovationpressure >= 0.5
    && [1, 2, 3, 4, 5].indexOf(doc.districttype) !== -1
    && [3, 4].indexOf(doc.publictransportquality) !== -1
  ) {
    emit('c', doc.lat + ',' + doc.long)
  }
}


function filter_gutu(doc) {
  if (
    doc.isemptyparcel === true
  ) {
    emit('c', doc.lat + ',' + doc.long)
  }
}


function filter_pvt_invest(doc) {
  if (
    doc.renovationpressure <= 0.2
    && doc.addr_anzahlwohnungen_parcel >= 10
    && doc.populationgrowth > 0
    && [1, 2, 3, 4, 5].indexOf(doc.districttype) !== -1
    && [3, 4].indexOf(doc.publictransportquality) !== -1
  ) {
    emit('c', doc.lat + ',' + doc.long)
  }
}
