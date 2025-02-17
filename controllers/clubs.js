import connection from "../config/dbconnection.js";
const db = await connection();

export const zone = async (req, res) => {
  const zoneName = req.zoneName;
  const regionName = req.regionName;
  const title = req.title;
  try {
    if (!title.includes("Zone Chairperson")) {
      return res.status(400).json({ message: "Not a zone chairperson" });
    }
    const sql = `
    SELECT u.clubName, u.clubId, u.regionName, u.zoneName,
           MAX(a.createdAt) AS latestActivity,
           COUNT(r.month) > 0 AS currentAdminReport
    FROM users u
    LEFT JOIN activities a ON u.clubId = a.clubId
    LEFT JOIN reporting r ON u.clubId = r.clubId AND r.month = MONTH(NOW())
    WHERE u.zoneName = ? AND u.regionName = ?
    GROUP BY u.clubId, u.clubName
  `;

    const [data] = await db.promise().query(sql, [zoneName, regionName]);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const region = async (req, res) => {
  const regionName = req.regionName;
  const title = req.title;
  try {
    if (!title.includes("Region Chairperson")) {
      return res.status(400).json({ message: "Not a Region Chairperson" });
    }
    const sql = `
    SELECT u.clubName, u.clubId, u.regionName, u.zoneName,
           MAX(a.createdAt) AS latestActivity,
           COUNT(r.month) > 0 AS currentAdminReport
    FROM users u
    LEFT JOIN activities a ON u.clubId = a.clubId
    LEFT JOIN reporting r ON u.clubId = r.clubId AND r.month = MONTH(NOW())
    WHERE u.regionName = ?
    GROUP BY u.clubId, u.clubName, u.regionName, u.zoneName
  `;
    const [data] = await db.promise().query(sql, [regionName]);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const allClubs = async (req, res) => {
  try {
    const sql =
      "SELECT clubName, MAX(clubId) AS clubId FROM clubs GROUP BY clubName";
    const [data] = await db.promise().query(sql);
    const clubs = data.map((club) => ({ ...club, isChecked: false }));
    return res.status(200).json(clubs);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const userTitles = async (req, res) => {
  try {
    const sql = "SELECT DISTINCT title FROM users";
    const [data] = await db.promise().query(sql);
    const titles = data.map((title) => ({ ...title, isChecked: false }));
    return res.status(200).json(titles);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadMemberData = async (req, res) => {
  try {
    const clubs = req.body.selectedClubs;
    const clubIds = clubs.map((club) => club.clubId);
    const titles = req.body.selectedTitles;
    const selectedTitles = titles
      .filter((title) => title.isChecked)
      .map((title) => title.title);
    if (clubs.length === 0) {
      return res.status(400).json({ message: "Please Select Club" });
    }
    if (titles.length === 0) {
      return res.status(400).json({ message: "Please Select Titles" });
    }
    const sql = `
      SELECT clubName,firstName,lastName,occupation,phone,regionName,zoneName,title FROM users 
      WHERE clubName IN (SELECT clubName FROM clubs WHERE clubId IN (?)) 
      AND title IN (?)
    `;
    const [payload] = await db.promise().query(sql, [clubIds, selectedTitles]);
    return res
      .status(200)
      .json({ payload, successMessage: "Data Fetched Successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getDistrictData = async (req, res) => {
  try {
    const sql = `
      SELECT CONCAT(firstname,middlename,lastname) AS name,regionName, zoneName, clubName, clubId FROM users
      ORDER BY regionName, zoneName, clubName
    `;
    const [data] = await db.promise().query(sql);
    const districtData = [];

    for (const row of data) {
      const region = districtData.find(
        (region) => region.name === row.regionName
      );

      if (!region) {
        districtData.push({
          name: row.regionName,
          chairPerson: "",
          zones: [],
        });
      }

      const zone = districtData
        .find((region) => region.name === row.regionName)
        .zones.find((zone) => zone.name === row.zoneName);

      if (!zone) {
        districtData
          .find((region) => region.name === row.regionName)
          .zones.push({
            name: row.zoneName,
            chairPerson: "",
            clubs: [],
          });
      }

      const club = districtData
        .find((region) => region.name === row.regionName)
        .zones.find((zone) => zone.name === row.zoneName)
        .clubs.find((club) => club.id === row.clubId);

      if (!club) {
        districtData
          .find((region) => region.name === row.regionName)
          .zones.find((zone) => zone.name === row.zoneName)
          .clubs.push({
            name: row.clubName,
            id: row.clubId,
          });
      }
    }

    return res.status(200).json(districtData);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
