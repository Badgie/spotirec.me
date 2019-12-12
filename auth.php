<?php
if ($_GET['code']) {
  exec("/path/to/name.sh" + $_GET['code']);
}
?>